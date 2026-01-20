import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { 
  APP_COLORS, 
  VGP_COLORS, 
  DEFAULT_CHECKLIST,
  MODE_FONCTIONNEMENT_OPTIONS,
  BATI_OPTIONS,
  COMMANDES_MOUVEMENTS_OPTIONS,
  MODE_CHARGEMENT_OPTIONS,
  MODE_DECHARGEMENT_OPTIONS,
  COURSE_TYPE_OPTIONS,
  OUTILLAGE_OPTIONS,
  REFERENCE_OUTILLAGE_OPTIONS,
} from '@/constants/vgp';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import { ChecklistItem, ProtectionDevice, MachineParticularites } from '@/types';

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  autreValue: string;
  onAutreChange: (value: string) => void;
}

function MultiSelectField({
  label,
  options,
  selected,
  onToggle,
  autreValue,
  onAutreChange,
}: MultiSelectFieldProps) {
  const hasAutre = options.includes('Autre');
  const isAutreSelected = selected.includes('Autre');

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.multiSelectOption}
          onPress={() => onToggle(option)}
        >
          <View style={[
            styles.multiSelectCheckbox,
            selected.includes(option) && styles.multiSelectCheckboxChecked,
          ]}>
            {selected.includes(option) && (
              <CheckCircle2 size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.multiSelectLabel}>{option}</Text>
        </TouchableOpacity>
      ))}
      {hasAutre && isAutreSelected && (
        <TextInput
          style={[styles.textInput, styles.autreInput]}
          value={autreValue}
          onChangeText={onAutreChange}
          placeholder="Précisez..."
          placeholderTextColor={APP_COLORS.textSecondary}
        />
      )}
    </View>
  );
}

export default function ControlSessionScreen() {
  const { clientId, machines: machinesParam } = useLocalSearchParams<{ 
    clientId: string; 
    machines: string;
  }>();
  const { user } = useAuth();
  const { getClient, getMachine, addVGPHistory, checkpointTemplates } = useData();
  const router = useRouter();
  
  const machineIds = machinesParam.split(',');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [observations, setObservations] = useState<string>('');
  const [completedMachines, setCompletedMachines] = useState<Set<string>>(new Set());
  const [protectionDevices, setProtectionDevices] = useState<ProtectionDevice>({
    boutonsArret: false,
    protecteursFixes: false,
    protecteursMobilesVerrouilles: false,
    limitationVitesse: false,
    pedale3Positions: false,
  });
  const [particularites, setParticularites] = useState<MachineParticularites>({
    modeFonctionnement: [],
    bati: [],
    commandesMouvements: [],
    modeChargement: [],
    modeDechargement: [],
    course: { type: '', valeur: '' },
    outillageEnPlace: [],
    referenceOutillage: '',
  });
  const [autreModeFonctionnement, setAutreModeFonctionnement] = useState<string>('');
  const [autreBati, setAutreBati] = useState<string>('');
  const [autreCommandesMouvements, setAutreCommandesMouvements] = useState<string>('');
  const [autreModeChargement, setAutreModeChargement] = useState<string>('');
  const [autreModeDechargement, setAutreModeDechargement] = useState<string>('');
  const [autreOutillage, setAutreOutillage] = useState<string>('');

  const client = getClient(clientId);
  const currentMachine = getMachine(machineIds[currentIndex]);

  useEffect(() => {
    const activeCheckpoints = checkpointTemplates
      .filter((c) => c.actif)
      .sort((a, b) => a.ordre - b.ordre);

    const items: ChecklistItem[] = activeCheckpoints.length > 0
      ? activeCheckpoints.map((checkpoint) => ({
          id: checkpoint.id,
          label: checkpoint.label,
        }))
      : DEFAULT_CHECKLIST.map((item, index) => ({
          id: `item-${index}`,
          label: item.label,
        }));

    setChecklist(items);
    setObservations(currentMachine?.observations || '');
  }, [currentIndex, currentMachine, checkpointTemplates]);



  const updateChecklistItem = (id: string, reponse: 'oui' | 'non' | 'autre', details?: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, reponse, details: reponse === 'autre' ? details : undefined }
          : item
      )
    );
  };

  const handleSaveAndNext = async () => {
    if (!currentMachine || !user) return;

    const allItemsChecked = checklist.every((item) => item.reponse !== undefined);

    if (!allItemsChecked) {
      Alert.alert('Attention', 'Veuillez remplir tous les points de contrôle');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const conforme = checklist.every((item) => item.reponse === 'oui');

    await addVGPHistory({
      machineId: currentMachine.id,
      dateControl: today,
      technicienId: user.id,
      technicienEmail: user.email,
      checklist,
      observations: observations || '',
      conforme,
      protectionDevices,
      particularites,
    });

    setCompletedMachines((prev) => new Set(prev).add(currentMachine.id));

    if (currentIndex < machineIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      Alert.alert(
        'Session terminée',
        `Contrôle de ${machineIds.length} machine(s) terminé avec succès`,
        [
          {
            text: 'Retour au client',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!client || !currentMachine) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erreur de chargement</Text>
      </View>
    );
  }

  const progress = ((currentIndex + 1) / machineIds.length) * 100;
  const isCompleted = completedMachines.has(currentMachine.id);

  return (
    <>
      <Stack.Screen
        options={{
          title: `Contrôle ${currentIndex + 1}/${machineIds.length}`,
        }}
      />
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Machine {currentIndex + 1} sur {machineIds.length}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.machineHeader}>
            <Text style={styles.machineTitle}>
              {currentMachine.constructeur} {currentMachine.modele}
            </Text>
            <Text style={styles.machineSerial}>N° série: {currentMachine.numeroSerie}</Text>
            <Text style={styles.machineClient}>Client: {client.nom}</Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <CheckCircle2 size={16} color={VGP_COLORS.ok} />
                <Text style={styles.completedText}>Contrôle effectué</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points de contrôle VGP</Text>
            <Text style={styles.sectionSubtitle}>
              Conformément à l&apos;arrêté du 1er mars 2004
            </Text>
            {checklist.map((item, index) => (
              <View key={item.id} style={styles.checklistItem}>
                <Text style={styles.checklistNumber}>{index + 1}.</Text>
                <View style={styles.checklistContent}>
                  <Text style={styles.checklistLabel}>{item.label}</Text>
                  <View style={styles.checklistOptions}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        item.reponse === 'oui' && styles.optionButtonOui,
                      ]}
                      onPress={() => updateChecklistItem(item.id, 'oui')}
                    >
                      <CheckCircle2 
                        size={16} 
                        color={item.reponse === 'oui' ? '#FFFFFF' : APP_COLORS.textSecondary} 
                      />
                      <Text
                        style={[
                          styles.optionText,
                          item.reponse === 'oui' && styles.optionTextActive,
                        ]}
                      >
                        Oui
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        item.reponse === 'non' && styles.optionButtonNon,
                      ]}
                      onPress={() => updateChecklistItem(item.id, 'non')}
                    >
                      <XCircle 
                        size={16} 
                        color={item.reponse === 'non' ? '#FFFFFF' : APP_COLORS.textSecondary} 
                      />
                      <Text
                        style={[
                          styles.optionText,
                          item.reponse === 'non' && styles.optionTextActive,
                        ]}
                      >
                        Non
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        item.reponse === 'autre' && styles.optionButtonAutre,
                      ]}
                      onPress={() => updateChecklistItem(item.id, 'autre', '')}
                    >
                      <AlertTriangle 
                        size={16} 
                        color={item.reponse === 'autre' ? '#FFFFFF' : APP_COLORS.textSecondary} 
                      />
                      <Text
                        style={[
                          styles.optionText,
                          item.reponse === 'autre' && styles.optionTextActive,
                        ]}
                      >
                        Autre
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {item.reponse === 'autre' && (
                    <TextInput
                      style={styles.detailsInput}
                      value={item.details || ''}
                      onChangeText={(text) => updateChecklistItem(item.id, 'autre', text)}
                      placeholder="Précisez..."
                      placeholderTextColor={APP_COLORS.textSecondary}
                      multiline
                    />
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispositifs de protection</Text>
            <Text style={styles.sectionSubtitle}>
              Cochez les dispositifs présents sur la machine
            </Text>
            {[
              { key: 'boutonsArret' as const, label: 'Boutons Arrêt' },
              { key: 'protecteursFixes' as const, label: 'Protecteurs fixes' },
              { key: 'protecteursMobilesVerrouilles' as const, label: 'Protecteurs mobiles verrouillés' },
              { key: 'limitationVitesse' as const, label: 'Limitation vitesse à un seuil inférieur à 10 mm/s' },
              { key: 'pedale3Positions' as const, label: 'Pédale 3 positions' },
            ].map((device) => (
              <TouchableOpacity
                key={device.key}
                style={styles.checkboxRow}
                onPress={() => setProtectionDevices((prev) => ({
                  ...prev,
                  [device.key]: !prev[device.key],
                }))}
              >
                <View style={[
                  styles.checkbox,
                  protectionDevices[device.key] && styles.checkboxChecked,
                ]}>
                  {protectionDevices[device.key] && (
                    <CheckCircle2 size={18} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{device.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Particularités</Text>
            <Text style={styles.sectionSubtitle}>
              Détails techniques de la machine
            </Text>
            
            <MultiSelectField
              label="Mode(s) de fonctionnement existant(s)"
              options={MODE_FONCTIONNEMENT_OPTIONS}
              selected={particularites.modeFonctionnement}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  modeFonctionnement: prev.modeFonctionnement.includes(option)
                    ? prev.modeFonctionnement.filter((item) => item !== option)
                    : [...prev.modeFonctionnement, option],
                }));
              }}
              autreValue={autreModeFonctionnement}
              onAutreChange={setAutreModeFonctionnement}
            />

            <MultiSelectField
              label="Bâti"
              options={BATI_OPTIONS}
              selected={particularites.bati}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  bati: prev.bati.includes(option)
                    ? prev.bati.filter((item) => item !== option)
                    : [...prev.bati, option],
                }));
              }}
              autreValue={autreBati}
              onAutreChange={setAutreBati}
            />

            <MultiSelectField
              label="Commandes des mouvements"
              options={COMMANDES_MOUVEMENTS_OPTIONS}
              selected={particularites.commandesMouvements}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  commandesMouvements: prev.commandesMouvements.includes(option)
                    ? prev.commandesMouvements.filter((item) => item !== option)
                    : [...prev.commandesMouvements, option],
                }));
              }}
              autreValue={autreCommandesMouvements}
              onAutreChange={setAutreCommandesMouvements}
            />

            <MultiSelectField
              label="Mode de chargement"
              options={MODE_CHARGEMENT_OPTIONS}
              selected={particularites.modeChargement}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  modeChargement: prev.modeChargement.includes(option)
                    ? prev.modeChargement.filter((item) => item !== option)
                    : [...prev.modeChargement, option],
                }));
              }}
              autreValue={autreModeChargement}
              onAutreChange={setAutreModeChargement}
            />

            <MultiSelectField
              label="Mode de déchargement"
              options={MODE_DECHARGEMENT_OPTIONS}
              selected={particularites.modeDechargement}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  modeDechargement: prev.modeDechargement.includes(option)
                    ? prev.modeDechargement.filter((item) => item !== option)
                    : [...prev.modeDechargement, option],
                }));
              }}
              autreValue={autreModeDechargement}
              onAutreChange={setAutreModeDechargement}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Course</Text>
              <View style={styles.courseContainer}>
                {COURSE_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.radioButton,
                      particularites.course.type === option && styles.radioButtonSelected,
                    ]}
                    onPress={() => setParticularites((prev) => ({
                      ...prev,
                      course: { ...prev.course, type: option },
                    }))}
                  >
                    <View style={[
                      styles.radioCircle,
                      particularites.course.type === option && styles.radioCircleSelected,
                    ]} />
                    <Text style={[
                      styles.radioLabel,
                      particularites.course.type === option && styles.radioLabelSelected,
                    ]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(particularites.course.type === 'Course fixe' || particularites.course.type === 'Course réglable') && (
                <TextInput
                  style={[styles.textInput, { marginTop: 12 }]}
                  value={particularites.course.valeur}
                  onChangeText={(text) => setParticularites((prev) => ({
                    ...prev,
                    course: { ...prev.course, valeur: text },
                  }))}
                  placeholder="Valeur de course (mm)"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  keyboardType="numeric"
                />
              )}
            </View>

            <MultiSelectField
              label="Outillage en place"
              options={OUTILLAGE_OPTIONS}
              selected={particularites.outillageEnPlace}
              onToggle={(option) => {
                setParticularites((prev) => ({
                  ...prev,
                  outillageEnPlace: prev.outillageEnPlace.includes(option)
                    ? prev.outillageEnPlace.filter((item) => item !== option)
                    : [...prev.outillageEnPlace, option],
                }));
              }}
              autreValue={autreOutillage}
              onAutreChange={setAutreOutillage}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Référence outillage</Text>
              <View style={styles.referenceContainer}>
                {REFERENCE_OUTILLAGE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.radioButton,
                      particularites.referenceOutillage === option && styles.radioButtonSelected,
                    ]}
                    onPress={() => setParticularites((prev) => ({
                      ...prev,
                      referenceOutillage: option,
                    }))}
                  >
                    <View style={[
                      styles.radioCircle,
                      particularites.referenceOutillage === option && styles.radioCircleSelected,
                    ]} />
                    <Text style={[
                      styles.radioLabel,
                      particularites.referenceOutillage === option && styles.radioLabelSelected,
                    ]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(particularites.referenceOutillage.startsWith('Référence constructeur') || particularites.referenceOutillage.startsWith('Référence interne client')) ? (
                <TextInput
                  style={[styles.textInput, { marginTop: 12 }]}
                  value={particularites.referenceOutillage.includes(':') ? particularites.referenceOutillage.split(': ')[1] : ''}
                  onChangeText={(text) => {
                    const baseType = particularites.referenceOutillage.includes(':') 
                      ? particularites.referenceOutillage.split(':')[0] 
                      : particularites.referenceOutillage;
                    setParticularites((prev) => ({
                      ...prev,
                      referenceOutillage: text ? `${baseType}: ${text}` : baseType,
                    }));
                  }}
                  placeholder="Saisir la référence"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations générales</Text>
            <TextInput
              style={styles.observationsInput}
              value={observations}
              onChangeText={setObservations}
              placeholder="Notes, recommandations, anomalies détectées..."
              placeholderTextColor={APP_COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonSecondary]}
              onPress={handlePrevious}
            >
              <ChevronLeft size={20} color={APP_COLORS.text} />
              <Text style={styles.footerButtonTextSecondary}>Précédent</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary, { flex: 1 }]}
            onPress={handleSaveAndNext}
          >
            <Text style={styles.footerButtonText}>
              {currentIndex < machineIds.length - 1 ? 'Enregistrer et suivant' : 'Terminer'}
            </Text>
            {currentIndex < machineIds.length - 1 && (
              <ChevronRight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  progressContainer: {
    backgroundColor: APP_COLORS.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: APP_COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: VGP_COLORS.ok,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  machineHeader: {
    backgroundColor: APP_COLORS.cardBackground,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  machineTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  machineSerial: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  machineClient: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: VGP_COLORS.ok,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 20,
    fontStyle: 'italic' as const,
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  checklistNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginRight: 12,
    marginTop: 2,
  },
  checklistContent: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 16,
    color: APP_COLORS.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  checklistOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.cardBackground,
    gap: 6,
  },
  optionButtonOui: {
    backgroundColor: VGP_COLORS.ok,
    borderColor: VGP_COLORS.ok,
  },
  optionButtonNon: {
    backgroundColor: VGP_COLORS.overdue,
    borderColor: VGP_COLORS.overdue,
  },
  optionButtonAutre: {
    backgroundColor: VGP_COLORS.warning,
    borderColor: VGP_COLORS.warning,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  detailsInput: {
    marginTop: 12,
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: APP_COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  observationsInput: {
    backgroundColor: APP_COLORS.cardBackground,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 20,
    backgroundColor: APP_COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  footerButtonPrimary: {
    backgroundColor: APP_COLORS.primary,
  },
  footerButtonSecondary: {
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  footerButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  errorText: {
    fontSize: 16,
    color: APP_COLORS.error,
    textAlign: 'center',
    marginTop: 40,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: VGP_COLORS.ok,
    borderColor: VGP_COLORS.ok,
  },
  checkboxLabel: {
    fontSize: 15,
    color: APP_COLORS.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: APP_COLORS.cardBackground,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: APP_COLORS.text,
  },
  courseContainer: {
    gap: 8,
  },
  referenceContainer: {
    gap: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.cardBackground,
    gap: 10,
  },
  radioButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: APP_COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.cardBackground,
  },
  radioCircleSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: APP_COLORS.text,
    flex: 1,
  },
  radioLabelSelected: {
    color: APP_COLORS.primary,
    fontWeight: '600' as const,
  },
  multiSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  multiSelectCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiSelectCheckboxChecked: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  multiSelectLabel: {
    fontSize: 15,
    color: APP_COLORS.text,
    flex: 1,
  },
  autreInput: {
    marginTop: 8,
    marginLeft: 30,
  },
});
