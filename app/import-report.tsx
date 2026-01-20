import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useData } from '@/providers/DataProvider';
import { ReportImportPayload, ImportLog } from '@/types';
import { APP_COLORS } from '@/constants/vgp';
import { FileText, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react-native';

export default function ImportReportScreen() {
  const { importReport } = useData();
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      Alert.alert('Erreur', 'Veuillez coller le JSON du rapport');
      return;
    }

    try {
      console.log('[ImportReport] Parsing JSON...');
      const payload: ReportImportPayload = JSON.parse(jsonInput);

      if (!payload.client || !payload.report || !payload.machines) {
        Alert.alert('Erreur', 'Format JSON invalide: client, report et machines sont requis');
        return;
      }

      if (!payload.report.report_number) {
        Alert.alert('Erreur', 'Le numéro de rapport est requis');
        return;
      }

      if (!payload.machines.length) {
        Alert.alert('Erreur', 'Au moins une machine est requise');
        return;
      }

      const performImport = async (replaceExisting: boolean = false) => {
        setImporting(true);
        setShowLogs(false);
        try {
          const result = await importReport(payload, replaceExisting);
          setLogs(result.logs);
          setShowLogs(true);
          Alert.alert(
            'Import réussi',
            `Rapport ${payload.report.report_number} importé avec succès`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setJsonInput('');
                  setShowLogs(false);
                  setLogs([]);
                },
              },
            ]
          );
        } catch (error: any) {
          console.error('[ImportReport] Error:', error);
          if (error.message && error.message.includes('existe déjà')) {
            Alert.alert(
              'Rapport existant',
              `Le rapport ${payload.report.report_number} existe déjà dans la base de données.\n\nQue voulez-vous faire?`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Remplacer',
                  style: 'destructive',
                  onPress: () => performImport(true),
                },
              ]
            );
          } else {
            Alert.alert('Erreur d\'import', error.message || 'Une erreur est survenue');
          }
        } finally {
          setImporting(false);
        }
      };

      Alert.alert(
        'Confirmer l\'import',
        `Rapport: ${payload.report.report_number}\nClient: ${payload.client.nom}\nMachines: ${payload.machines.length}\n\nContinuer?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            onPress: () => performImport(false),
          },
        ]
      );
    } catch {
      Alert.alert('Erreur JSON', 'Le JSON fourni n&apos;est pas valide');
    }
  };

  const handleValidate = () => {
    if (!jsonInput.trim()) {
      Alert.alert('Erreur', 'Veuillez coller le JSON du rapport');
      return;
    }

    try {
      const payload: ReportImportPayload = JSON.parse(jsonInput);
      
      const errors: string[] = [];
      if (!payload.client) errors.push('• client manquant');
      if (!payload.report) errors.push('• report manquant');
      if (!payload.machines) errors.push('• machines manquant');
      if (payload.report && !payload.report.report_number) errors.push('• report_number manquant');
      
      if (errors.length > 0) {
        Alert.alert('Validation échouée', errors.join('\n'));
        return;
      }

      const info = [
        `Rapport: ${payload.report.report_number}`,
        `Client: ${payload.client.nom}`,
        `Adresse: ${payload.client.adresse}`,
        `Machines: ${payload.machines.length}`,
        payload.report.date_verification ? `Date vérif: ${payload.report.date_verification}` : null,
        payload.report.organisme ? `Organisme: ${payload.report.organisme}` : null,
      ].filter(Boolean).join('\n');

      Alert.alert('Validation réussie', info);
    } catch {
      Alert.alert('Erreur JSON', 'Le JSON fourni n&apos;est pas valide');
    }
  };

  const getLogIcon = (log: ImportLog) => {
    if (log.action === 'created') return <CheckCircle size={16} color="#10b981" />;
    if (log.action === 'updated') return <Info size={16} color="#3b82f6" />;
    return <Info size={16} color="#6b7280" />;
  };

  const getLogColor = (log: ImportLog) => {
    if (log.action === 'created') return '#10b981';
    if (log.action === 'updated') return '#3b82f6';
    return '#6b7280';
  };

  const getLogLabel = (log: ImportLog) => {
    const typeLabels: Record<ImportLog['type'], string> = {
      client: 'Client',
      machine: 'Machine',
      report: 'Rapport',
      inspection: 'Inspection',
      observation: 'Observation',
      vgp_history: 'Historique VGP',
    };
    
    const actionLabels: Record<ImportLog['action'], string> = {
      created: 'créé',
      updated: 'mis à jour',
      skipped: 'ignoré',
    };

    return `${typeLabels[log.type]} ${actionLabels[log.action]}${log.name ? `: ${log.name}` : ''}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Importer un rapport',
          headerStyle: { backgroundColor: APP_COLORS.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FileText size={48} color={APP_COLORS.primary} />
          <Text style={styles.title}>Import JSON</Text>
          <Text style={styles.subtitle}>
            Collez le JSON du rapport extrait ci-dessous
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            placeholder="Collez le JSON ici..."
            placeholderTextColor="#9ca3af"
            value={jsonInput}
            onChangeText={setJsonInput}
            multiline
            textAlignVertical="top"
            editable={!importing}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.validateButton]}
            onPress={handleValidate}
            disabled={importing || !jsonInput.trim()}
          >
            <AlertCircle size={20} color="#fff" />
            <Text style={styles.buttonText}>Valider</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.importButton, importing && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={importing || !jsonInput.trim()}
          >
            {importing ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>Import en cours...</Text>
              </>
            ) : (
              <>
                <Upload size={20} color="#fff" />
                <Text style={styles.buttonText}>Importer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {showLogs && logs.length > 0 && (
          <View style={styles.logsSection}>
            <Text style={styles.logsTitle}>Résultat de l&apos;import</Text>
            {logs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                {getLogIcon(log)}
                <Text style={[styles.logText, { color: getLogColor(log) }]}>
                  {getLogLabel(log)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Format attendu :</Text>
          <Text style={styles.helpText}>
            {`{
  "client": {
    "nom": "Nom Client",
    "adresse": "Adresse",
    "contactNom": "...",
    "contactPrenom": "...",
    "contactEmail": "...",
    "contactTelephone": "..."
  },
  "site": {
    "nom_site": "...",
    "adresse": "..."
  },
  "report": {
    "report_number": "R-2024-001",
    "date_verification": "2024-01-15",
    "date_rapport": "2024-01-15",
    "organisme": "DEKRA",
    "categorie": "...",
    "signataire_nom": "..."
  },
  "machines": [
    {
      "titre_section": "...",
      "constructeur": "Toyota",
      "modele": "...",
      "numeroSerie": "...",
      "referenceClient": "...",
      "force": "...",
      "anneeMiseEnService": 2020,
      "resultat_status": "OK",
      "resultat_comment": "...",
      "observations": [
        {
          "numero": 1,
          "point_de_controle": "...",
          "observation": "...",
          "date_1er_constat": "2024-01-15"
        }
      ]
    }
  ]
}`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 200,
    maxHeight: 400,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  validateButton: {
    backgroundColor: '#3b82f6',
  },
  importButton: {
    backgroundColor: APP_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  logText: {
    fontSize: 14,
    flex: 1,
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
