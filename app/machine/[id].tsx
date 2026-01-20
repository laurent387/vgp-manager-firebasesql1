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
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { ChecklistItem, CustomField } from '@/types';
import DatePickerInput from '@/components/DatePickerInput';
import { APP_COLORS, VGP_COLORS, DEFAULT_PERIODICITY } from '@/constants/vgp';
import { getVGPStatus, getDaysUntilVGP, calculateNextVGP, formatDate } from '@/utils/vgp';
import { 
  Edit2, 
  Trash2,
  AlertCircle,
  Calendar,
  Wrench,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  File,
  ExternalLink,
  Shield,
} from 'lucide-react-native';

export default function MachineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canEditMachineFields, canAddCustomFields } = useAuth();
  const { getMachine, getClient, deleteMachine, getVGPHistoryByMachine, reportInspections, reports, getObservationsByInspection } = useData();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState<boolean>(false);
  const [showAddField, setShowAddField] = useState<boolean>(false);
  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);
  const [showLastVGPReport, setShowLastVGPReport] = useState<boolean>(false);
  const [selectedInspection, setSelectedInspection] = useState<string | null>(null);

  const machine = getMachine(id);
  const client = machine ? getClient(machine.clientId) : null;
  const vgpHistoryRaw = machine ? getVGPHistoryByMachine(machine.id) : [];
  const machineInspections = machine ? reportInspections.filter(i => i.machineId === machine.id) : [];
  
  const inspectionDates = new Set(
    machineInspections
      .map(i => {
        const report = reports.find(r => r.id === i.reportId);
        return report?.date_verification;
      })
      .filter(Boolean)
  );
  
  const vgpHistory = vgpHistoryRaw.filter(h => !inspectionDates.has(h.dateControl));

  if (!machine || !client) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Machine introuvable</Text>
      </View>
    );
  }

  const status = getVGPStatus(machine.prochaineVGP);
  const statusColor = VGP_COLORS[status];
  const daysUntil = getDaysUntilVGP(machine.prochaineVGP);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la machine',
      'Voulez-vous vraiment supprimer cette machine ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteMachine(id);
            router.back();
            Alert.alert('Succès', 'Machine supprimée');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `${machine.constructeur} ${machine.modele}`,
          headerRight: () =>
            canEditMachineFields ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setShowEdit(true)} style={styles.headerButton}>
                  <Edit2 size={20} color={APP_COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                  <Trash2 size={20} color={APP_COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <AlertCircle size={24} color="#FFFFFF" />
          <Text style={styles.statusText}>
            {machine.prochaineVGP
              ? daysUntil < 0
                ? `VGP en retard de ${Math.abs(daysUntil)} jours`
                : `VGP dans ${daysUntil} jours`
              : 'Pas de VGP programmée'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations client</Text>
          <InfoRow label="Entreprise" value={client.nom} />
          <InfoRow label="Nom" value={client.contactNom} />
          <InfoRow label="Prénom" value={client.contactPrenom} />
          <InfoRow label="Email" value={client.contactEmail} />
          <InfoRow label="Numéro de téléphone" value={client.contactTelephone} />
          <InfoRow label="Adresse" value={client.adresse} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations machine</Text>
          <InfoRow label="Constructeur" value={machine.constructeur} />
          <InfoRow label="Modèle" value={machine.modele} />
          <InfoRow label="Numéro de série" value={machine.numeroSerie} />
          <InfoRow 
            label="Date de mise en service" 
            value={formatDate(machine.dateMiseEnService)} 
          />
          <InfoRow 
            label="Périodicité VGP" 
            value={`${machine.periodicite} mois`} 
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={APP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Contrôles VGP</Text>
          </View>
          {machine.dateDerniereVGP ? (
            <>
              <TouchableOpacity 
                onPress={() => vgpHistory.length > 0 && setShowLastVGPReport(true)}
                disabled={vgpHistory.length === 0}
                activeOpacity={vgpHistory.length > 0 ? 0.7 : 1}
              >
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dernière VGP</Text>
                  <View style={styles.infoValueContainer}>
                    <Text style={[styles.infoValue, vgpHistory.length > 0 && styles.infoValueClickable]}>
                      {formatDate(machine.dateDerniereVGP)}
                    </Text>
                    {vgpHistory.length > 0 && (
                      <FileText size={16} color={APP_COLORS.primary} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              {machine.prochaineVGP && (
                <InfoRow 
                  label="Prochaine VGP" 
                  value={formatDate(machine.prochaineVGP)}
                  valueColor={statusColor}
                />
              )}
            </>
          ) : (
            <Text style={styles.noDataText}>Aucune VGP enregistrée</Text>
          )}
        </View>

        {machine.customFields && machine.customFields.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wrench size={20} color={APP_COLORS.primary} />
              <Text style={styles.sectionTitle}>Champs personnalisés</Text>
            </View>
            {machine.customFields.map((field: CustomField) => {
              if (field.type === 'photo' && field.value) {
                return (
                  <View key={field.id} style={styles.customFieldContainer}>
                    <Text style={styles.customFieldLabel}>{field.label}</Text>
                    <View style={styles.photoContainer}>
                      <Image 
                        source={{ uri: field.value }} 
                        style={styles.photoPreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => Linking.openURL(field.value!)}
                      >
                        <ExternalLink size={16} color={APP_COLORS.primary} />
                        <Text style={styles.viewButtonText}>Ouvrir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
              
              if (field.type === 'pdf' && field.value) {
                return (
                  <View key={field.id} style={styles.customFieldContainer}>
                    <Text style={styles.customFieldLabel}>{field.label}</Text>
                    <TouchableOpacity 
                      style={styles.pdfButton}
                      onPress={() => Linking.openURL(field.value!)}
                    >
                      <File size={20} color={APP_COLORS.primary} />
                      <Text style={styles.pdfButtonText}>Voir le PDF</Text>
                      <ExternalLink size={16} color={APP_COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                );
              }
              
              return (
                <InfoRow 
                  key={field.id}
                  label={field.label} 
                  value={field.value || 'Non renseigné'} 
                />
              );
            })}
          </View>
        )}

        {vgpHistory.length > 0 && vgpHistory[0].particularites && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wrench size={20} color={APP_COLORS.primary} />
              <Text style={styles.sectionTitle}>Particularités de la machine</Text>
            </View>
            {renderMachineParticularites(vgpHistory[0].particularites)}
          </View>
        )}

        {vgpHistory.length > 0 && vgpHistory[0].protectionDevices && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={APP_COLORS.primary} />
              <Text style={styles.sectionTitle}>Dispositifs de protection</Text>
            </View>
            {renderProtectionDevices(vgpHistory[0].protectionDevices)}
          </View>
        )}

        {machine.observations && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wrench size={20} color={APP_COLORS.primary} />
              <Text style={styles.sectionTitle}>Observations</Text>
            </View>
            <Text style={styles.observationsText}>{machine.observations}</Text>
          </View>
        )}

        {(vgpHistoryRaw.length > 0 || machineInspections.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={APP_COLORS.primary} />
              <Text style={styles.sectionTitle}>Historique des contrôles ({vgpHistory.length + machineInspections.length})</Text>
            </View>
            
            {machineInspections.length > 0 && (
              <View style={styles.inspectionsSection}>
                <Text style={styles.subsectionTitle}>Contrôles importés (DEKRA)</Text>
                {machineInspections.map((inspection) => {
                  const report = reports.find(r => r.id === inspection.reportId);
                  const observations = getObservationsByInspection(inspection.id);

                  return (
                    <View key={inspection.id} style={styles.timelineItem}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: inspection.resultat_status === 'OK' ? VGP_COLORS.ok : VGP_COLORS.overdue }
                      ]} />
                      <TouchableOpacity 
                        style={styles.historyCard}
                        onPress={() => setSelectedInspection(inspection.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.historyHeader}>
                          <View style={styles.historyHeaderLeft}>
                            <FileText size={16} color={APP_COLORS.primary} />
                            <Text style={styles.historyDate}>
                              {report?.date_verification ? formatDate(report.date_verification) : 'Date inconnue'}
                            </Text>
                          </View>
                          <View style={styles.historyHeaderRight}>
                            <View style={[
                              styles.historyBadge,
                              { backgroundColor: inspection.resultat_status === 'OK' ? '#DCFCE7' : '#FEE2E2' }
                            ]}>
                              {inspection.resultat_status === 'OK' ? (
                                <CheckCircle2 size={14} color={VGP_COLORS.ok} />
                              ) : (
                                <XCircle size={14} color={VGP_COLORS.overdue} />
                              )}
                              <Text style={[
                                styles.historyBadgeText,
                                { color: inspection.resultat_status === 'OK' ? VGP_COLORS.ok : VGP_COLORS.overdue }
                              ]}>
                                {inspection.resultat_status || 'N/A'}
                              </Text>
                            </View>
                            <ExternalLink size={16} color={APP_COLORS.primary} />
                          </View>
                        </View>

                        <View style={styles.historyMeta}>
                          <User size={14} color={APP_COLORS.textSecondary} />
                          <Text style={styles.historyTech}>{report?.organisme || 'DEKRA'} - {report?.report_number}</Text>
                        </View>

                        {observations.length > 0 && (
                          <View style={styles.observationsPreview}>
                            <AlertCircle size={14} color={VGP_COLORS.warning} />
                            <Text style={styles.observationsPreviewText}>
                              {observations.length} point{observations.length > 1 ? 's' : ''} de contrôle
                            </Text>
                          </View>
                        )}

                        {inspection.resultat_comment && (
                          <Text style={styles.commentPreview} numberOfLines={2}>
                            {inspection.resultat_comment}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
            {vgpHistory.map((history, index) => {
              const isExpanded = expandedHistory.includes(history.id);
              const toggleExpand = () => {
                setExpandedHistory(prev => 
                  prev.includes(history.id) 
                    ? prev.filter(id => id !== history.id)
                    : [...prev, history.id]
                );
              };

              return (
                <View key={history.id} style={styles.timelineItem}>
                  {index !== vgpHistory.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: history.conforme ? VGP_COLORS.ok : VGP_COLORS.overdue }
                  ]} />
                  <TouchableOpacity 
                    style={styles.historyCard}
                    onPress={toggleExpand}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyHeader}>
                      <View style={styles.historyHeaderLeft}>
                        <Calendar size={16} color={APP_COLORS.textSecondary} />
                        <Text style={styles.historyDate}>{formatDate(history.dateControl)}</Text>
                      </View>
                      <View style={styles.historyHeaderRight}>
                        <View style={[
                          styles.historyBadge,
                          { backgroundColor: history.conforme ? '#DCFCE7' : '#FEE2E2' }
                        ]}>
                          {history.conforme ? (
                            <CheckCircle2 size={14} color={VGP_COLORS.ok} />
                          ) : (
                            <XCircle size={14} color={VGP_COLORS.overdue} />
                          )}
                          <Text style={[
                            styles.historyBadgeText,
                            { color: history.conforme ? VGP_COLORS.ok : VGP_COLORS.overdue }
                          ]}>
                            {history.conforme ? 'Conforme' : 'Non conforme'}
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={APP_COLORS.textSecondary} />
                        ) : (
                          <ChevronDown size={20} color={APP_COLORS.textSecondary} />
                        )}
                      </View>
                    </View>

                    <View style={styles.historyMeta}>
                      <User size={14} color={APP_COLORS.textSecondary} />
                      <Text style={styles.historyTech}>{history.technicienEmail}</Text>
                    </View>

                    {isExpanded && (
                      <View style={styles.historyDetails}>
                        <View style={styles.divider} />
                        
                        <View style={styles.checklistSection}>
                          <Text style={styles.checklistTitle}>Points de contrôle</Text>
                          {(history.checklist || []).map((item) => (
                            <View key={item.id} style={styles.checklistItemRow}>
                              <View style={styles.checklistItemLeft}>
                                {item.reponse === 'oui' && (
                                  <CheckCircle2 size={16} color={VGP_COLORS.ok} />
                                )}
                                {item.reponse === 'non' && (
                                  <XCircle size={16} color={VGP_COLORS.overdue} />
                                )}
                                {item.reponse === 'autre' && (
                                  <AlertCircle size={16} color={VGP_COLORS.warning} />
                                )}
                                {!item.reponse && (
                                  <View style={styles.checklistEmpty} />
                                )}
                                <Text style={styles.checklistItemLabel}>{item.label}</Text>
                              </View>
                              {item.reponse && (
                                <Text style={[
                                  styles.checklistItemReponse,
                                  item.reponse === 'oui' && { color: VGP_COLORS.ok },
                                  item.reponse === 'non' && { color: VGP_COLORS.overdue },
                                  item.reponse === 'autre' && { color: VGP_COLORS.warning },
                                ]}>
                                  {item.reponse === 'oui' && 'Oui'}
                                  {item.reponse === 'non' && 'Non'}
                                  {item.reponse === 'autre' && 'Autre'}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>

                        {history.observations && (
                          <View style={styles.observationsSection}>
                            <View style={styles.observationsHeader}>
                              <FileText size={14} color={APP_COLORS.textSecondary} />
                              <Text style={styles.observationsTitle}>Observations</Text>
                            </View>
                            <Text style={styles.historyObs}>{history.observations}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.infoText}>
            Conformément au Code du travail et à l&apos;arrêté du 1er mars 2004, 
            les équipements de travail servant au levage de charges doivent faire 
            l&apos;objet de vérifications générales périodiques (VGP).
          </Text>
        </View>
      </ScrollView>

      {canEditMachineFields && (
        <EditMachineModal
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          machine={machine}
        />
      )}
      {canAddCustomFields && (
        <AddCustomFieldModal
          visible={showAddField}
          onClose={() => setShowAddField(false)}
          machineId={id}
        />
      )}
      {vgpHistory.length > 0 && (
        <LastVGPReportModal
          visible={showLastVGPReport}
          onClose={() => setShowLastVGPReport(false)}
          vgpHistory={vgpHistory[0]}
          machine={machine}
          client={client}
        />
      )}
      {selectedInspection && (
        <InspectionDetailModal
          visible={!!selectedInspection}
          onClose={() => setSelectedInspection(null)}
          inspectionId={selectedInspection}
          machine={machine}
          client={client}
        />
      )}
    </>
  );
}

function InfoRow({ 
  label, 
  value, 
  valueColor 
}: { 
  label: string; 
  value: string; 
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

function renderMachineParticularites(particularites: any) {
  if (!particularites) return null;

  return (
    <View>
      {particularites.modeFonctionnement && particularites.modeFonctionnement.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode(s) de fonctionnement:</Text>
          <Text style={styles.infoValue}>{particularites.modeFonctionnement.join(', ')}</Text>
        </View>
      )}
      
      {particularites.bati && particularites.bati.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bâti:</Text>
          <Text style={styles.infoValue}>{particularites.bati.join(', ')}</Text>
        </View>
      )}
      
      {particularites.commandesMouvements && particularites.commandesMouvements.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Commandes des mouvements:</Text>
          <Text style={styles.infoValue}>{particularites.commandesMouvements.join(', ')}</Text>
        </View>
      )}
      
      {particularites.modeChargement && particularites.modeChargement.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode de chargement:</Text>
          <Text style={styles.infoValue}>{particularites.modeChargement.join(', ')}</Text>
        </View>
      )}
      
      {particularites.modeDechargement && particularites.modeDechargement.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode de déchargement:</Text>
          <Text style={styles.infoValue}>{particularites.modeDechargement.join(', ')}</Text>
        </View>
      )}
      
      {particularites.course && particularites.course.type && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Course:</Text>
          <Text style={styles.infoValue}>
            {particularites.course.type}
            {particularites.course.valeur ? ` - ${particularites.course.valeur} mm` : ''}
          </Text>
        </View>
      )}
      
      {particularites.outillageEnPlace && particularites.outillageEnPlace.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Outillage en place:</Text>
          <Text style={styles.infoValue}>{particularites.outillageEnPlace.join(', ')}</Text>
        </View>
      )}
      
      {particularites.referenceOutillage && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Référence outillage:</Text>
          <Text style={styles.infoValue}>{particularites.referenceOutillage}</Text>
        </View>
      )}
    </View>
  );
}

function renderProtectionDevices(devices: any) {
  if (!devices) return null;

  const devicesList = [
    { key: 'boutonsArret', label: 'Boutons Arrêt', value: devices.boutonsArret },
    { key: 'protecteursFixes', label: 'Protecteurs fixes', value: devices.protecteursFixes },
    { key: 'protecteursMobilesVerrouilles', label: 'Protecteurs mobiles verrouillés', value: devices.protecteursMobilesVerrouilles },
    { key: 'limitationVitesse', label: 'Limitation vitesse à un seuil inférieur à 10 mm/s', value: devices.limitationVitesse },
    { key: 'pedale3Positions', label: 'Pédale 3 positions', value: devices.pedale3Positions },
  ].filter(d => d.value);

  if (devicesList.length === 0) {
    return <Text style={styles.noDataText}>Aucun dispositif de protection renseigné</Text>;
  }

  return (
    <View>
      {devicesList.map((device) => (
        <View key={device.key} style={styles.infoRow}>
          <CheckCircle2 size={16} color={VGP_COLORS.ok} />
          <Text style={[styles.infoValue, { flex: 2, textAlign: 'left', marginLeft: 8 }]}>{device.label}</Text>
        </View>
      ))}
    </View>
  );
}

function renderParticularites(particularites: any) {
  if (!particularites) return null;

  try {
    const data = typeof particularites === 'string' ? JSON.parse(particularites) : particularites;

    return (
      <View style={styles.particularitesContainer}>
        {data.details && typeof data.details === 'object' && (
          <View style={styles.particularitesSection}>
            <Text style={styles.particularitesSectionTitle}>Détails</Text>
            {Object.entries(data.details).map(([key, value]) => (
              <View key={key} style={styles.particularitesRow}>
                <Text style={styles.particularitesLabel}>{key}:</Text>
                <Text style={styles.particularitesValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {data.dispositifs_protection && Array.isArray(data.dispositifs_protection) && data.dispositifs_protection.length > 0 && (
          <View style={styles.particularitesSection}>
            <Text style={styles.particularitesSectionTitle}>Dispositifs de protection</Text>
            {data.dispositifs_protection.map((dispositif: string, index: number) => (
              <View key={index} style={styles.dispositifItem}>
                <View style={styles.dispositifBullet} />
                <Text style={styles.dispositifText}>{dispositif}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  } catch {
    return (
      <Text style={styles.reportObservations}>
        {typeof particularites === 'string' ? particularites : JSON.stringify(particularites, null, 2)}
      </Text>
    );
  }
}

function EditMachineModal({
  visible,
  onClose,
  machine,
}: {
  visible: boolean;
  onClose: () => void;
  machine: {
    id: string;
    clientId: string;
    dateMiseEnService: string;
    numeroSerie: string;
    constructeur: string;
    modele: string;
    typeMachine: 'mobile' | 'fixe' | 'presse_plieuse';
    dateDerniereVGP?: string;
    observations?: string;
    customFields?: { id: string; key: string; label: string; type: 'text' | 'number' | 'date' | 'photo' | 'pdf'; value?: string }[];
  };
}) {
  const { updateMachine } = useData();
  const [dateMiseEnService, setDateMiseEnService] = useState<string>(machine.dateMiseEnService);
  const [numeroSerie, setNumeroSerie] = useState<string>(machine.numeroSerie);
  const [constructeur, setConstructeur] = useState<string>(machine.constructeur);
  const [modele, setModele] = useState<string>(machine.modele);
  const [typeMachine, setTypeMachine] = useState<'mobile' | 'fixe' | 'presse_plieuse'>(machine.typeMachine);
  const [dateDerniereVGP, setDateDerniereVGP] = useState<string>(machine.dateDerniereVGP || '');
  const [observations, setObservations] = useState<string>(machine.observations || '');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!dateMiseEnService || !numeroSerie || !constructeur || !modele) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const periodicite = DEFAULT_PERIODICITY[typeMachine];
      const prochaineVGP = dateDerniereVGP
        ? calculateNextVGP(dateDerniereVGP, periodicite)
        : undefined;

      await updateMachine({
        ...machine,
        dateMiseEnService,
        numeroSerie,
        constructeur,
        modele,
        typeMachine,
        dateDerniereVGP: dateDerniereVGP || undefined,
        prochaineVGP,
        periodicite,
        observations: observations || undefined,
      });

      Alert.alert('Succès', 'Machine modifiée avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating machine:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la machine</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type de machine *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    typeMachine === 'mobile' && styles.segmentButtonActive,
                  ]}
                  onPress={() => setTypeMachine('mobile')}
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
                  onPress={() => setTypeMachine('fixe')}
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
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function InspectionDetailModal({
  visible,
  onClose,
  inspectionId,
  machine,
  client,
}: {
  visible: boolean;
  onClose: () => void;
  inspectionId: string;
  machine: {
    constructeur: string;
    modele: string;
    numeroSerie: string;
    typeMachine: 'mobile' | 'fixe' | 'presse_plieuse';
  };
  client: {
    nom: string;
    adresse: string;
  };
}) {
  const { reportInspections, reports, getObservationsByInspection } = useData();
  const inspection = reportInspections.find(i => i.id === inspectionId);
  const report = inspection ? reports.find(r => r.id === inspection.reportId) : null;
  const observations = inspection ? getObservationsByInspection(inspection.id) : [];

  if (!inspection || !report) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.reportModalContent}>
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportTitle}>Contrôle DEKRA</Text>
              <Text style={styles.reportSubtitle}>{report.report_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Informations du contrôle</Text>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Date du contrôle:</Text>
                <Text style={styles.reportValue}>
                  {report.date_verification ? formatDate(report.date_verification) : 'Non renseignée'}
                </Text>
              </View>
              {report.date_rapport && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Date du rapport:</Text>
                  <Text style={styles.reportValue}>{formatDate(report.date_rapport)}</Text>
                </View>
              )}
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Organisme:</Text>
                <Text style={styles.reportValue}>{report.organisme || 'DEKRA'}</Text>
              </View>
              {report.signataire_nom && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Signataire:</Text>
                  <Text style={styles.reportValue}>{report.signataire_nom}</Text>
                </View>
              )}
              {report.categorie && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Catégorie:</Text>
                  <Text style={styles.reportValue}>{report.categorie}</Text>
                </View>
              )}
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Résultat:</Text>
                <View style={[
                  styles.reportBadge,
                  { backgroundColor: inspection.resultat_status === 'OK' ? '#DCFCE7' : '#FEE2E2' }
                ]}>
                  {inspection.resultat_status === 'OK' ? (
                    <CheckCircle2 size={14} color={VGP_COLORS.ok} />
                  ) : (
                    <XCircle size={14} color={VGP_COLORS.overdue} />
                  )}
                  <Text style={[
                    styles.reportBadgeText,
                    { color: inspection.resultat_status === 'OK' ? VGP_COLORS.ok : VGP_COLORS.overdue }
                  ]}>
                    {inspection.resultat_status || 'Non renseigné'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Machine contrôlée</Text>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Client:</Text>
                <Text style={styles.reportValue}>{client.nom}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Adresse:</Text>
                <Text style={styles.reportValue}>{client.adresse}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Constructeur:</Text>
                <Text style={styles.reportValue}>{machine.constructeur}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Modèle:</Text>
                <Text style={styles.reportValue}>{machine.modele}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>N° de série:</Text>
                <Text style={styles.reportValue}>{machine.numeroSerie}</Text>
              </View>
              {inspection.titre_section && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Section:</Text>
                  <Text style={styles.reportValue}>{inspection.titre_section}</Text>
                </View>
              )}
              {inspection.mission_code && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Code mission:</Text>
                  <Text style={styles.reportValue}>{inspection.mission_code}</Text>
                </View>
              )}
              {inspection.texte_reference && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Texte de référence:</Text>
                  <Text style={styles.reportValue}>{inspection.texte_reference}</Text>
                </View>
              )}
            </View>

            {observations.length > 0 && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Points de contrôle ({observations.length})</Text>
                {observations.map((obs, index) => (
                  <View key={obs.id} style={styles.reportChecklistItem}>
                    <View style={styles.reportChecklistHeader}>
                      <Text style={styles.reportChecklistNumber}>{obs.numero || index + 1}.</Text>
                      <Text style={styles.reportChecklistLabel}>
                        {obs.point_de_controle || 'Point de contrôle non renseigné'}
                      </Text>
                    </View>
                    {obs.observation && (
                      <Text style={styles.reportChecklistDetails}>{obs.observation}</Text>
                    )}
                    {obs.date_1er_constat && (
                      <View style={styles.observationMeta}>
                        <Calendar size={12} color={APP_COLORS.textSecondary} />
                        <Text style={styles.observationMetaText}>
                          1er constat: {formatDate(obs.date_1er_constat)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {inspection.resultat_comment && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Commentaires</Text>
                <Text style={styles.reportObservations}>{inspection.resultat_comment}</Text>
              </View>
            )}

            {inspection.particularites_json && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Particularités</Text>
                {renderParticularites(inspection.particularites_json)}
              </View>
            )}

            <View style={styles.reportFooter}>
              <Text style={styles.reportFooterText}>
                Rapport importé depuis DEKRA - {report.report_number}
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.reportButtonContainer}>
            <TouchableOpacity
              style={styles.reportCloseButton}
              onPress={onClose}
            >
              <Text style={styles.reportCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LastVGPReportModal({
  visible,
  onClose,
  vgpHistory,
  machine,
  client,
}: {
  visible: boolean;
  onClose: () => void;
  vgpHistory: {
    id: string;
    dateControl: string;
    technicienEmail?: string;
    checklist?: ChecklistItem[];
    observations?: string;
    conforme?: boolean;
    protectionDevices?: {
      boutonsArret: boolean;
      protecteursFixes: boolean;
      protecteursMobilesVerrouilles: boolean;
      limitationVitesse: boolean;
      pedale3Positions: boolean;
    };
    particularites?: {
      modeFonctionnement: string[];
      bati: string[];
      commandesMouvements: string[];
      modeChargement: string[];
      modeDechargement: string[];
      course: {
        type: string;
        valeur: string;
      };
      outillageEnPlace: string[];
      referenceOutillage: string;
    };
  };
  machine: {
    constructeur: string;
    modele: string;
    numeroSerie: string;
    typeMachine: 'mobile' | 'fixe' | 'presse_plieuse';
  };
  client: {
    nom: string;
    adresse: string;
  };
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.reportModalContent}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Rapport de Contrôle VGP</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Informations du contrôle</Text>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Date du contrôle:</Text>
                <Text style={styles.reportValue}>{formatDate(vgpHistory.dateControl)}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Technicien:</Text>
                <Text style={styles.reportValue}>{vgpHistory.technicienEmail}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Résultat:</Text>
                <View style={[
                  styles.reportBadge,
                  { backgroundColor: vgpHistory.conforme ? '#DCFCE7' : '#FEE2E2' }
                ]}>
                  {vgpHistory.conforme ? (
                    <CheckCircle2 size={14} color={VGP_COLORS.ok} />
                  ) : (
                    <XCircle size={14} color={VGP_COLORS.overdue} />
                  )}
                  <Text style={[
                    styles.reportBadgeText,
                    { color: vgpHistory.conforme ? VGP_COLORS.ok : VGP_COLORS.overdue }
                  ]}>
                    {vgpHistory.conforme ? 'Conforme' : 'Non conforme'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Machine contrôlée</Text>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Client:</Text>
                <Text style={styles.reportValue}>{client.nom}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Adresse:</Text>
                <Text style={styles.reportValue}>{client.adresse}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Constructeur:</Text>
                <Text style={styles.reportValue}>{machine.constructeur}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Modèle:</Text>
                <Text style={styles.reportValue}>{machine.modele}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>N° de série:</Text>
                <Text style={styles.reportValue}>{machine.numeroSerie}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Type:</Text>
                <Text style={styles.reportValue}>
                  {machine.typeMachine === 'mobile' ? 'Mobile' : machine.typeMachine === 'fixe' ? 'Fixe' : 'Presse plieuse'}
                </Text>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Points de contrôle</Text>
              {(vgpHistory.checklist || []).map((item, index) => (
                <View key={item.id} style={styles.reportChecklistItem}>
                  <View style={styles.reportChecklistHeader}>
                    <Text style={styles.reportChecklistNumber}>{index + 1}.</Text>
                    <Text style={styles.reportChecklistLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.reportChecklistResponse}>
                    {item.reponse === 'oui' && (
                      <View style={styles.reportResponseBadge}>
                        <CheckCircle2 size={14} color={VGP_COLORS.ok} />
                        <Text style={[styles.reportResponseText, { color: VGP_COLORS.ok }]}>Oui</Text>
                      </View>
                    )}
                    {item.reponse === 'non' && (
                      <View style={styles.reportResponseBadge}>
                        <XCircle size={14} color={VGP_COLORS.overdue} />
                        <Text style={[styles.reportResponseText, { color: VGP_COLORS.overdue }]}>Non</Text>
                      </View>
                    )}
                    {item.reponse === 'autre' && (
                      <View style={styles.reportResponseBadge}>
                        <AlertCircle size={14} color={VGP_COLORS.warning} />
                        <Text style={[styles.reportResponseText, { color: VGP_COLORS.warning }]}>Autre</Text>
                      </View>
                    )}
                  </View>
                  {item.details && (
                    <Text style={styles.reportChecklistDetails}>{item.details}</Text>
                  )}
                </View>
              ))}
            </View>

            {vgpHistory.protectionDevices && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Dispositifs de protection</Text>
                {[
                  { key: 'boutonsArret' as const, label: 'Boutons Arrêt' },
                  { key: 'protecteursFixes' as const, label: 'Protecteurs fixes' },
                  { key: 'protecteursMobilesVerrouilles' as const, label: 'Protecteurs mobiles verrouillés' },
                  { key: 'limitationVitesse' as const, label: 'Limitation vitesse à un seuil inférieur à 10 mm/s' },
                  { key: 'pedale3Positions' as const, label: 'Pédale 3 positions' },
                ].map((device) => (
                  vgpHistory.protectionDevices![device.key] && (
                    <View key={device.key} style={styles.reportRow}>
                      <CheckCircle2 size={16} color={VGP_COLORS.ok} />
                      <Text style={styles.reportValue}>{device.label}</Text>
                    </View>
                  )
                ))}
              </View>
            )}

            {vgpHistory.particularites && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Particularités</Text>
                
                {vgpHistory.particularites.modeFonctionnement.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Mode(s) de fonctionnement existant(s):</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.modeFonctionnement.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.bati.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Bâti:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.bati.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.commandesMouvements.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Commandes des mouvements:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.commandesMouvements.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.modeChargement.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Mode de chargement:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.modeChargement.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.modeDechargement.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Mode de déchargement:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.modeDechargement.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.course.type && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Course:</Text>
                    <Text style={styles.reportValue}>
                      {vgpHistory.particularites.course.type}
                      {vgpHistory.particularites.course.valeur ? ` - ${vgpHistory.particularites.course.valeur} mm` : ''}
                    </Text>
                  </View>
                )}
                
                {vgpHistory.particularites.outillageEnPlace.length > 0 && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Outillage en place:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.outillageEnPlace.join(', ')}</Text>
                  </View>
                )}
                
                {vgpHistory.particularites.referenceOutillage && (
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Référence outillage:</Text>
                    <Text style={styles.reportValue}>{vgpHistory.particularites.referenceOutillage}</Text>
                  </View>
                )}
              </View>
            )}

            {vgpHistory.observations && (
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Observations</Text>
                <Text style={styles.reportObservations}>{vgpHistory.observations}</Text>
              </View>
            )}

            <View style={styles.reportFooter}>
              <Text style={styles.reportFooterText}>
                Conformément au Code du travail et à l&apos;arrêté du 1er mars 2004
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.reportButtonContainer}>
            <TouchableOpacity
              style={styles.reportCloseButton}
              onPress={onClose}
            >
              <Text style={styles.reportCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddCustomFieldModal({
  visible,
  onClose,
  machineId,
}: {
  visible: boolean;
  onClose: () => void;
  machineId: string;
}) {
  const { addCustomFieldToMachine } = useData();
  const [label, setLabel] = useState<string>('');
  const [type, setType] = useState<'text' | 'number' | 'date' | 'photo' | 'pdf'>('text');
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!label) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom du champ');
      return;
    }

    setLoading(true);
    try {
      await addCustomFieldToMachine(machineId, {
        key: label.toLowerCase().replace(/\s+/g, '_'),
        label,
        type,
        value: value || undefined,
      });

      Alert.alert('Succès', 'Champ personnalisé ajouté');
      setLabel('');
      setType('text');
      setValue('');
      onClose();
    } catch (error) {
      console.error('Error adding custom field:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nouveau champ personnalisé</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom du champ *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Capacité de charge"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.typeGrid}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'text' && styles.typeButtonActive,
                ]}
                onPress={() => setType('text')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'text' && styles.typeButtonTextActive,
                  ]}
                >
                  Texte
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'number' && styles.typeButtonActive,
                ]}
                onPress={() => setType('number')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'number' && styles.typeButtonTextActive,
                  ]}
                >
                  Nombre
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'date' && styles.typeButtonActive,
                ]}
                onPress={() => setType('date')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'date' && styles.typeButtonTextActive,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'photo' && styles.typeButtonActive,
                ]}
                onPress={() => setType('photo')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'photo' && styles.typeButtonTextActive,
                  ]}
                >
                  Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'pdf' && styles.typeButtonActive,
                ]}
                onPress={() => setType('pdf')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'pdf' && styles.typeButtonTextActive,
                  ]}
                >
                  PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {type === 'photo' ? 'URL de la photo' : type === 'pdf' ? 'URL du PDF' : 'Valeur'}
            </Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder={
                type === 'photo' 
                  ? 'https://exemple.com/photo.jpg' 
                  : type === 'pdf'
                  ? 'https://exemple.com/document.pdf'
                  : 'Valeur initiale (optionnel)'
              }
              placeholderTextColor={APP_COLORS.textSecondary}
              keyboardType={type === 'number' ? 'numeric' : 'default'}
              autoCapitalize="none"
            />
            {(type === 'photo' || type === 'pdf') && (
              <Text style={styles.helperText}>
                Saisissez l&apos;URL complète du fichier hébergé en ligne
              </Text>
            )}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: APP_COLORS.cardBackground,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: APP_COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoValueClickable: {
    color: APP_COLORS.primary,
  },
  observationsText: {
    fontSize: 14,
    color: APP_COLORS.text,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
  },
  infoText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },
  errorText: {
    fontSize: 16,
    color: APP_COLORS.error,
    textAlign: 'center',
    marginTop: 40,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 8,
  },
  headerButton: {
    padding: 4,
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
  timelineItem: {
    position: 'relative',
    paddingLeft: 32,
    marginBottom: 12,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -12,
    width: 2,
    backgroundColor: APP_COLORS.border,
  },
  timelineDot: {
    position: 'absolute',
    left: 6,
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: APP_COLORS.cardBackground,
  },
  historyCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTech: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  historyDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: APP_COLORS.border,
    marginBottom: 16,
  },
  checklistSection: {
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  checklistItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 8,
    marginBottom: 6,
  },
  checklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checklistItemLabel: {
    fontSize: 13,
    color: APP_COLORS.text,
    flex: 1,
  },
  checklistItemReponse: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  checklistEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  observationsSection: {
    marginTop: 12,
  },
  observationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  observationsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  historyObs: {
    fontSize: 13,
    color: APP_COLORS.text,
    lineHeight: 20,
    paddingLeft: 20,
  },
  customFieldContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  customFieldLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: APP_COLORS.background,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${APP_COLORS.primary}15`,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  pdfButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  reportModalContent: {
    backgroundColor: APP_COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 24,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: APP_COLORS.textSecondary,
  },
  reportSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    flex: 1,
  },
  reportValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportChecklistItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 8,
  },
  reportChecklistHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reportChecklistNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginRight: 8,
  },
  reportChecklistLabel: {
    fontSize: 14,
    color: APP_COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  reportChecklistResponse: {
    marginLeft: 22,
  },
  reportResponseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  reportResponseText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  reportChecklistDetails: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginLeft: 22,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  reportObservations: {
    fontSize: 14,
    color: APP_COLORS.text,
    lineHeight: 20,
  },
  reportFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  reportFooterText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
    lineHeight: 18,
    textAlign: 'center',
  },
  reportButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: APP_COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  reportCloseButton: {
    paddingVertical: 16,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportCloseButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  inspectionsSection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  observationsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  observationsPreviewText: {
    fontSize: 13,
    color: VGP_COLORS.warning,
    fontWeight: '600' as const,
  },
  commentPreview: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic' as const,
    lineHeight: 16,
  },
  reportSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  observationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 22,
    marginTop: 6,
  },
  observationMetaText: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
  },
  particularitesContainer: {
    gap: 16,
  },
  particularitesSection: {
    marginBottom: 12,
  },
  particularitesSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 10,
  },
  particularitesRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 6,
    marginBottom: 4,
  },
  particularitesLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    flex: 1,
  },
  particularitesValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  dispositifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 6,
    marginBottom: 4,
  },
  dispositifBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: APP_COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },
  dispositifText: {
    fontSize: 13,
    color: APP_COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
});
