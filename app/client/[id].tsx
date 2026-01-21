import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { Client } from '@/types';
import { APP_COLORS, VGP_COLORS, PERIODICITY_OPTIONS } from '@/constants/vgp';
import { getVGPStatus, getDaysUntilVGP, calculateNextVGP, formatDate } from '@/utils/vgp';
import { exportClientReportCSV, exportClientReportPDF } from '@/utils/export';
import { 
  Plus, 
  Edit2, 
  Trash2,
  AlertCircle,
  PlayCircle,
  Building2,
  FileDown,
  FileText,
  Calendar,
  ScanLine,
} from 'lucide-react-native';
import PlateScanner from '@/components/PlateScanner';
import DatePickerInput from '@/components/DatePickerInput';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canPerformControls, canManageClients, canAddMachines, user, isClient } = useAuth();
  
  console.log('Client Detail - User role:', user?.role, 'canPerformControls:', canPerformControls, 'canManageClients:', canManageClients);
  const { getClient, getMachinesByClient, deleteClient, vgpHistory } = useData();
  const router = useRouter();
  const [showAddMachine, setShowAddMachine] = useState<boolean>(false);
  const [showEditClient, setShowEditClient] = useState<boolean>(false);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);

  const client = getClient(id);
  const machines = getMachinesByClient(id);

  if (!client) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Client introuvable</Text>
      </View>
    );
  }

  const sortedMachines = [...machines].sort((a, b) => {
    const daysA = getDaysUntilVGP(a.prochaineVGP);
    const daysB = getDaysUntilVGP(b.prochaineVGP);
    return daysA - daysB;
  });

  const canEditClient = canManageClients || (isClient && user?.clientId === id);

  const handleDeleteClient = () => {
    Alert.alert(
      'Supprimer le client',
      `Voulez-vous vraiment supprimer ${client.nom} et toutes ses machines ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteClient(id);
            router.back();
            Alert.alert('Succès', 'Client supprimé');
          },
        },
      ]
    );
  };

  const toggleMachineSelection = (machineId: string) => {
    setSelectedMachines((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleStartControl = () => {
    if (selectedMachines.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une machine');
      return;
    }
    router.push(`/control/session?clientId=${id}&machines=${selectedMachines.join(',')}` as never);
  };

  const handleExportCSV = async () => {
    if (!client) return;
    setExportLoading(true);
    try {
      await exportClientReportCSV(client, machines, vgpHistory);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!client) return;
    setExportLoading(true);
    try {
      await exportClientReportPDF(client, machines, vgpHistory);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: client.nom,
          headerRight: () => (
            <View style={styles.headerActions}>
              {(canPerformControls || canManageClients || (isClient && user?.clientId === id)) && (
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Export button pressed');
                    setShowExportMenu(true);
                  }} 
                  style={styles.headerIconButton}
                >
                  <FileDown size={22} color={APP_COLORS.primary} />
                </TouchableOpacity>
              )}
              {canEditClient && (
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Edit client button pressed');
                    setShowEditClient(true);
                  }} 
                  style={styles.headerIconButton}
                >
                  <Edit2 size={22} color={APP_COLORS.primary} />
                </TouchableOpacity>
              )}
              {canManageClients && (
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Delete client button pressed');
                    handleDeleteClient();
                  }} 
                  style={styles.headerIconButton}
                >
                  <Trash2 size={22} color={APP_COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.clientHeader}>
          <View style={styles.clientIconLarge}>
            <Building2 size={32} color={APP_COLORS.primary} />
          </View>
          <Text style={styles.clientName}>{client.nom}</Text>
          <Text style={styles.clientInfo}>{client.adresse}</Text>
          <Text style={styles.clientInfo}>Contact: {client.contactPrenom} {client.contactNom}</Text>
          <Text style={styles.clientInfo}>Email: {client.contactEmail}</Text>
          <Text style={styles.clientInfo}>Téléphone: {client.contactTelephone}</Text>
          {canEditClient && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setShowEditClient(true)}
            >
              <Edit2 size={18} color={APP_COLORS.primary} />
              <Text style={styles.editProfileButtonText}>Modifier mes informations</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.statValue}>{machines.length}</Text>
            <Text style={styles.statLabel}>Machines</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statValue, { color: VGP_COLORS.warning }]}>
              {machines.filter((m) => {
                const status = getVGPStatus(m.prochaineVGP);
                return status === 'warning' || status === 'overdue';
              }).length}
            </Text>
            <Text style={styles.statLabel}>À prévoir</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statValue, { color: VGP_COLORS.overdue }]}>
              {machines.filter((m) => getVGPStatus(m.prochaineVGP) === 'overdue').length}
            </Text>
            <Text style={styles.statLabel}>En retard</Text>
          </View>
        </View>

        {(canAddMachines || canPerformControls || user?.role === 'admin') && (
          <View style={styles.actionsBar}>
            {canAddMachines && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowAddMachine(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Ajouter machine</Text>
              </TouchableOpacity>
            )}
            {user?.role === 'admin' && selectedMachines.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
                onPress={() => setShowPlanModal(true)}
              >
                <Calendar size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  Planifier ({selectedMachines.length})
                </Text>
              </TouchableOpacity>
            )}
            {user?.role === 'controleur' && selectedMachines.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: VGP_COLORS.ok }]}
                onPress={handleStartControl}
              >
                <PlayCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  Contrôle ({selectedMachines.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Machines ({machines.length})</Text>
          {sortedMachines.map((machine) => {
            const status = getVGPStatus(machine.prochaineVGP);
            const statusColor = VGP_COLORS[status];
            const daysUntil = getDaysUntilVGP(machine.prochaineVGP);
            const isSelected = selectedMachines.includes(machine.id);

            return (
              <TouchableOpacity
                key={machine.id}
                style={[
                  styles.machineCard,
                  isSelected && (canPerformControls || user?.role === 'admin') && styles.machineCardSelected,
                ]}
                onPress={() => router.push(`/machine/${machine.id}` as never)}
              >
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                {(canPerformControls || user?.role === 'admin') && (
                  <TouchableOpacity
                    style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                    onPress={(e) => {
                      if (Platform.OS === 'web') {
                        (e as any).stopPropagation();
                      } else {
                        e.stopPropagation();
                      }
                      toggleMachineSelection(machine.id);
                    }}
                  >
                    {isSelected && <View style={styles.checkboxInner} />}
                  </TouchableOpacity>
                )}
                <View style={styles.machineInfo}>
                  <Text style={styles.machineName}>
                    {machine.constructeur} {machine.modele}
                  </Text>
                  <Text style={styles.machineSerial}>N° série: {machine.numeroSerie}</Text>
                  <View style={styles.machineDetails}>
                    <Text style={styles.machineDetailText}>
                      Mise en service: {formatDate(machine.dateMiseEnService)}
                    </Text>
                    {machine.dateDerniereVGP && (
                      <Text style={styles.machineDetailText}>
                        Dernière VGP: {formatDate(machine.dateDerniereVGP)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.vgpInfo}>
                    <AlertCircle size={14} color={statusColor} />
                    <Text style={[styles.vgpText, { color: statusColor }]}>
                      {machine.prochaineVGP
                        ? daysUntil < 0
                          ? `En retard de ${Math.abs(daysUntil)} jours`
                          : `VGP dans ${daysUntil} jours (${formatDate(machine.prochaineVGP)})`
                        : 'Pas de VGP programmée'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {canAddMachines && (
          <AddMachineModal
            visible={showAddMachine}
            onClose={() => setShowAddMachine(false)}
            clientId={id}
          />
        )}
        {canEditClient && (
          <EditClientModal
            visible={showEditClient}
            onClose={() => setShowEditClient(false)}
            client={client}
          />
        )}
        {user?.role === 'admin' && (
          <PlanControlModal
            visible={showPlanModal}
            onClose={() => {
              setShowPlanModal(false);
              setSelectedMachines([]);
            }}
            clientId={id}
            machineIds={selectedMachines}
          />
        )}

        <Modal visible={showExportMenu} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.exportModalContent}>
              <Text style={styles.modalTitle}>Exporter le rapport</Text>
              <Text style={styles.exportDescription}>
                Choisissez le format d&apos;export pour le rapport client
              </Text>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportCSV}
                disabled={exportLoading}
              >
                <FileText size={24} color={APP_COLORS.primary} />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export CSV</Text>
                  <Text style={styles.exportOptionDescription}>
                    Format tabulaire pour Excel, Numbers, etc.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportPDF}
                disabled={exportLoading}
              >
                <FileDown size={24} color={APP_COLORS.primary} />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export PDF</Text>
                  <Text style={styles.exportOptionDescription}>
                    Rapport complet avec historique des contrôles
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowExportMenu(false)}
                disabled={exportLoading}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function AddMachineModal({
  visible,
  onClose,
  clientId,
}: {
  visible: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const { addMachine } = useData();
  const [dateMiseEnService, setDateMiseEnService] = useState<string>('');
  const [numeroSerie, setNumeroSerie] = useState<string>('');
  const [constructeur, setConstructeur] = useState<string>('');
  const [modele, setModele] = useState<string>('');
  const [typeMachine, setTypeMachine] = useState<'mobile' | 'fixe' | 'presse_plieuse'>('mobile');
  const [periodicite, setPeriodicite] = useState<number>(6);
  const [dateDerniereVGP, setDateDerniereVGP] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [platePhotoUri, setPlatePhotoUri] = useState<string | undefined>();
  const [anneeMiseEnService, setAnneeMiseEnService] = useState<number | undefined>();
  const [force, setForce] = useState<string | undefined>();

  const handleSubmit = async () => {
    if (!dateMiseEnService || !numeroSerie || !constructeur || !modele) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const prochaineVGP = dateDerniereVGP
        ? calculateNextVGP(dateDerniereVGP, periodicite)
        : undefined;

      const customFields = platePhotoUri
        ? [
            {
              id: `custom_${Date.now()}`,
              key: 'plate_photo',
              label: 'Photo plaque constructeur',
              type: 'photo' as const,
              value: platePhotoUri,
            },
          ]
        : undefined;

      await addMachine({
        clientId,
        dateMiseEnService,
        numeroSerie,
        constructeur,
        modele,
        typeMachine,
        dateDerniereVGP: dateDerniereVGP || undefined,
        prochaineVGP,
        periodicite,
        observations: observations || undefined,
        anneeMiseEnService,
        force,
        customFields,
      });

      Alert.alert('Succès', 'Machine ajoutée avec succès');
      setDateMiseEnService('');
      setNumeroSerie('');
      setConstructeur('');
      setModele('');
      setTypeMachine('mobile');
      setPeriodicite(6);
      setDateDerniereVGP('');
      setObservations('');
      setPlatePhotoUri(undefined);
      setAnneeMiseEnService(undefined);
      setForce(undefined);
      onClose();
    } catch (error) {
      console.error('Error adding machine:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleScanData = (data: any) => {
    console.log('[AddMachineModal] Scan data received:', data);
    if (data.constructeur) setConstructeur(data.constructeur);
    if (data.modele) setModele(data.modele);
    if (data.numeroSerie) setNumeroSerie(data.numeroSerie);
    if (data.anneeMiseEnService) {
      setAnneeMiseEnService(data.anneeMiseEnService);
      setDateMiseEnService(`${data.anneeMiseEnService}-01-01`);
    }
    if (data.force) setForce(data.force);
    if (data.photoUri) setPlatePhotoUri(data.photoUri);
    setShowScanner(false);
  };

  if (showScanner) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <PlateScanner
              onDataExtracted={handleScanData}
              onCancel={() => setShowScanner(false)}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle machine</Text>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
            >
              <ScanLine size={20} color={APP_COLORS.primary} />
              <Text style={styles.scanButtonText}>Scanner la plaque constructeur</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type de machine *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    typeMachine === 'mobile' && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    setTypeMachine('mobile');
                    setPeriodicite(6);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      typeMachine === 'mobile' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Mobile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    typeMachine === 'fixe' && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    setTypeMachine('fixe');
                    setPeriodicite(12);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      typeMachine === 'fixe' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Fixe
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    typeMachine === 'presse_plieuse' && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    setTypeMachine('presse_plieuse');
                    setPeriodicite(3);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      typeMachine === 'presse_plieuse' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Presse plieuse
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Périodicité VGP *</Text>
              <View style={styles.periodicityList}>
                {PERIODICITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.periodicityOption,
                      periodicite === option.value && styles.periodicityOptionActive,
                    ]}
                    onPress={() => setPeriodicite(option.value)}
                  >
                    <View style={styles.periodicityRadio}>
                      {periodicite === option.value && (
                        <View style={styles.periodicityRadioInner} />
                      )}
                    </View>
                    <View style={styles.periodicityContent}>
                      <Text
                        style={[
                          styles.periodicityLabel,
                          periodicite === option.value && styles.periodicityLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.periodicityDescription}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Constructeur *</Text>
              <TextInput
                style={styles.input}
                value={constructeur}
                onChangeText={setConstructeur}
                placeholder="Ex: Toyota, Genie, Konecranes..."
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Modèle *</Text>
              <TextInput
                style={styles.input}
                value={modele}
                onChangeText={setModele}
                placeholder="Ex: Forklift 8FG25"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Numéro de série *</Text>
              <TextInput
                style={styles.input}
                value={numeroSerie}
                onChangeText={setNumeroSerie}
                placeholder="CE-2020-4567"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>

            <DatePickerInput
              label="Date de mise en service"
              value={dateMiseEnService}
              onChange={setDateMiseEnService}
              required
            />

            <DatePickerInput
              label="Date dernière VGP"
              value={dateDerniereVGP}
              onChange={setDateDerniereVGP}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Observations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observations}
                onChangeText={setObservations}
                placeholder="Notes, état général..."
                placeholderTextColor={APP_COLORS.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function PlanControlModal({
  visible,
  onClose,
  clientId,
  machineIds,
}: {
  visible: boolean;
  onClose: () => void;
  clientId: string;
  machineIds: string[];
}) {
  const { users, getMachine, addScheduledEvent } = useData();
  const [selectedControleur, setSelectedControleur] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const controleurs = users.filter((u) => u.role === 'controleur');

  const handleSubmit = async () => {
    if (!selectedControleur) {
      Alert.alert('Erreur', 'Veuillez sélectionner un contrôleur');
      return;
    }
    if (!plannedDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date');
      return;
    }

    setLoading(true);
    try {
      const controleur = users.find((u) => u.id === selectedControleur);
      const controleurName = controleur
        ? `${controleur.prenom || ''} ${controleur.nom || ''}`.trim() || controleur.email
        : 'Inconnu';

      for (const machineId of machineIds) {
        const machine = getMachine(machineId);
        if (machine) {
          await addScheduledEvent({
            type: 'scheduled_control',
            clientId,
            machineId,
            controllerId: selectedControleur,
            scheduledDate: plannedDate,
            date: plannedDate,
            title: `Contrôle VGP - ${machine.constructeur} ${machine.modele}`,
            description: `Contrôleur: ${controleurName}\nN° série: ${machine.numeroSerie}`,
          });
        }
      }

      const machineNames = machineIds
        .map((id) => {
          const machine = getMachine(id);
          return machine ? `${machine.constructeur} ${machine.modele}` : '';
        })
        .filter(Boolean)
        .join(', ');

      Alert.alert(
        'Planification enregistrée',
        `Contrôle planifié le ${plannedDate}\nContrôleur: ${controleurName}\nMachines: ${machineNames}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedControleur('');
              setPlannedDate('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error planning control:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Planifier un contrôle</Text>

          <Text style={styles.planDescription}>
            {machineIds.length} machine{machineIds.length > 1 ? 's' : ''} sélectionnée{machineIds.length > 1 ? 's' : ''}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contrôleur assigné *</Text>
            {controleurs.length === 0 ? (
              <View style={styles.emptyControleurBox}>
                <Text style={styles.emptyControleurText}>
                  Aucun contrôleur disponible. Veuillez créer un utilisateur avec le rôle &quot;contrôleur&quot;.
                </Text>
              </View>
            ) : (
              <View style={styles.controleurList}>
                {controleurs.map((controleur) => {
                  const isSelected = selectedControleur === controleur.id;
                  const displayName = `${controleur.prenom || ''} ${controleur.nom || ''}`.trim() || controleur.email;
                  
                  return (
                    <TouchableOpacity
                      key={controleur.id}
                      style={[
                        styles.controleurOption,
                        isSelected && styles.controleurOptionActive,
                      ]}
                      onPress={() => setSelectedControleur(controleur.id)}
                    >
                      <View style={styles.controleurRadio}>
                        {isSelected && <View style={styles.controleurRadioInner} />}
                      </View>
                      <View style={styles.controleurInfo}>
                        <Text
                          style={[
                            styles.controleurName,
                            isSelected && styles.controleurNameActive,
                          ]}
                        >
                          {displayName}
                        </Text>
                        <Text style={styles.controleurEmail}>{controleur.email}</Text>
                        {controleur.qualifications && controleur.qualifications.length > 0 && (
                          <Text style={styles.controleurQualifications}>
                            {controleur.qualifications.map((q: { id: string; name: string }) => q.name).join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <DatePickerInput
            label="Date du contrôle"
            value={plannedDate}
            onChange={setPlannedDate}
            required
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                setSelectedControleur('');
                setPlannedDate('');
                onClose();
              }}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmit}
              disabled={loading || controleurs.length === 0}
            >
              <Text style={styles.modalButtonText}>
                {loading ? 'Planification...' : 'Planifier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditClientModal({
  visible,
  onClose,
  client,
}: {
  visible: boolean;
  onClose: () => void;
  client: Client;
}) {
  const { updateClient } = useData();
  const [nom, setNom] = useState<string>(client.nom);
  const [adresse, setAdresse] = useState<string>(client.adresse);
  const [contactNom, setContactNom] = useState<string>(client.contactNom);
  const [contactPrenom, setContactPrenom] = useState<string>(client.contactPrenom);
  const [contactEmail, setContactEmail] = useState<string>(client.contactEmail);
  const [contactTelephone, setContactTelephone] = useState<string>(client.contactTelephone);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!nom || !adresse || !contactNom || !contactPrenom || !contactEmail || !contactTelephone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await updateClient({ ...client, nom, adresse, contactNom, contactPrenom, contactEmail, contactTelephone });
      Alert.alert('Succès', 'Client modifié avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Modifier le client</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Entreprise *</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom de l'entreprise"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Adresse *</Text>
            <TextInput
              style={styles.input}
              value={adresse}
              onChangeText={setAdresse}
              placeholder="Adresse complète"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom du contact *</Text>
            <TextInput
              style={styles.input}
              value={contactNom}
              onChangeText={setContactNom}
              placeholder="Durand"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom du contact *</Text>
            <TextInput
              style={styles.input}
              value={contactPrenom}
              onChangeText={setContactPrenom}
              placeholder="Jean"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="jean.durand@exemple.fr"
              placeholderTextColor={APP_COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Numéro de téléphone *</Text>
            <TextInput
              style={styles.input}
              value={contactTelephone}
              onChangeText={setContactTelephone}
              placeholder="01 23 45 67 89"
              placeholderTextColor={APP_COLORS.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  clientHeader: {
    padding: 20,
    backgroundColor: APP_COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    alignItems: 'center',
  },
  clientIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  clientInfo: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  machineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  machineCardSelected: {
    borderColor: APP_COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  statusIndicator: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  machineSerial: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  machineDetails: {
    marginBottom: 8,
  },
  machineDetailText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 2,
  },
  vgpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vgpText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: APP_COLORS.error,
    textAlign: 'center',
    marginTop: 40,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: APP_COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: APP_COLORS.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: APP_COLORS.primary,
  },
  modalButtonSecondary: {
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalButtonTextSecondary: {
    color: APP_COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  exportModalContent: {
    backgroundColor: APP_COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  exportDescription: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  exportOptionText: {
    flex: 1,
    marginLeft: 16,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 18,
  },
  periodicityList: {
    gap: 12,
  },
  periodicityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
  },
  periodicityOptionActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  periodicityRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodicityRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: APP_COLORS.primary,
  },
  periodicityContent: {
    flex: 1,
  },
  periodicityLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  periodicityLabelActive: {
    color: APP_COLORS.primary,
  },
  periodicityDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 18,
  },
  planDescription: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 20,
  },
  controleurList: {
    gap: 12,
  },
  controleurOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
  },
  controleurOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  controleurRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controleurRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  controleurInfo: {
    flex: 1,
  },
  controleurName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  controleurNameActive: {
    color: '#6366F1',
  },
  controleurEmail: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  controleurQualifications: {
    fontSize: 12,
    color: '#6366F1',
    fontStyle: 'italic' as const,
  },
  emptyControleurBox: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  emptyControleurText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.primary,
  },
  editProfileButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
    marginBottom: 24,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
});
