import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { APP_COLORS } from '@/constants/vgp';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

interface PlateData {
  constructeur?: string;
  modele?: string;
  numeroSerie?: string;
  anneeMiseEnService?: number;
  force?: string;
  photoUri?: string;
}

interface PlateScannerProps {
  onDataExtracted: (data: PlateData) => void;
  onCancel: () => void;
}

const PlateInfoSchema = z.object({
  constructeur: z.string().optional().describe("Le nom du constructeur/fabricant"),
  modele: z.string().optional().describe("Le modèle de la machine"),
  numeroSerie: z.string().optional().describe("Le numéro de série"),
  anneeMiseEnService: z.number().optional().describe("L'année de mise en service ou de fabrication"),
  force: z.string().optional().describe("La capacité de levage ou force (par exemple '5T', '2000kg')"),
});

export default function PlateScanner({ onDataExtracted, onCancel }: PlateScannerProps) {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState<boolean>(false);
  const [cameraRef, setCameraRef] = useState<any>(null);

  const processImage = async (uri: string) => {
    setProcessing(true);
    try {
      console.log('[PlateScanner] Processing image:', uri);

      const base64Response = await fetch(uri);
      const blob = await base64Response.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('[PlateScanner] Extracting data with AI...');

      const extracted = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: base64Data,
              },
              {
                type: 'text',
                text: 'Analyse cette photo de plaque constructeur et extrait toutes les informations disponibles. Si une information n\'est pas visible ou lisible, ne la fournis pas. Cherche notamment le constructeur, le modèle, le numéro de série, l\'année de fabrication, et la capacité de levage.',
              },
            ],
          },
        ],
        schema: PlateInfoSchema,
      });

      console.log('[PlateScanner] Extracted data:', extracted);

      onDataExtracted({
        ...extracted,
        photoUri: uri,
      });

      Alert.alert('Succès', 'Informations extraites de la plaque');
    } catch (error) {
      console.error('[PlateScanner] Error processing image:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'extraire les informations. Vous pouvez continuer et saisir manuellement les données.',
        [
          {
            text: 'Continuer',
            onPress: () => {
              onDataExtracted({ photoUri: uri });
            },
          },
          {
            text: 'Réessayer',
            onPress: () => {
              setShowCamera(true);
            },
          },
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef) {
      Alert.alert('Erreur', 'Caméra non prête');
      return;
    }

    try {
      console.log('[PlateScanner] Taking photo...');
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      console.log('[PlateScanner] Photo taken:', photo.uri);
      setShowCamera(false);
      
      await processImage(photo.uri);
    } catch (error) {
      console.error('[PlateScanner] Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('[PlateScanner] Image picked:', uri);
        await processImage(uri);
      }
    } catch (error) {
      console.error('[PlateScanner] Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleOpenCamera = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Non disponible sur Web',
        'La caméra n\'est pas disponible sur le Web. Veuillez utiliser la sélection d\'image.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!permission) {
      Alert.alert('Erreur', 'Permissions non disponibles');
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission refusée', 'L\'accès à la caméra est nécessaire pour scanner la plaque');
        return;
      }
    }

    setShowCamera(true);
  };

  if (processing) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.processingContainer}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color={APP_COLORS.primary} />
            <Text style={styles.processingText}>Extraction des données...</Text>
            <Text style={styles.processingSubtext}>Analyse de la plaque en cours</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (showCamera) {
    return (
      <Modal visible animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={(ref) => setCameraRef(ref)}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity onPress={() => {
                  setShowCamera(false);
                  onCancel();
                }} style={styles.closeButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>Scanner la plaque</Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={styles.cameraGuide}>
                <View style={styles.guideBorder} />
                <Text style={styles.guideText}>
                  Positionnez la plaque constructeur{'\n'}dans le cadre
                </Text>
              </View>

              <View style={styles.cameraActions}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleTakePhoto}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner la plaque constructeur</Text>
      <Text style={styles.subtitle}>
        Prenez une photo de la plaque pour extraire automatiquement les informations
      </Text>

      <View style={styles.options}>
        <TouchableOpacity style={styles.optionButton} onPress={handleOpenCamera}>
          <Camera size={32} color={APP_COLORS.primary} />
          <Text style={styles.optionButtonText}>Prendre une photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton} onPress={handlePickImage}>
          <ImageIcon size={32} color={APP_COLORS.primary} />
          <Text style={styles.optionButtonText}>Choisir une image</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 32,
  },
  options: {
    gap: 16,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cameraGuide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  guideBorder: {
    width: 280,
    height: 200,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
  },
  guideText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraActions: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  processingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContent: {
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 240,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
});
