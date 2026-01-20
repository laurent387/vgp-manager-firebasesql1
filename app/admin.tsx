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
import { Stack, useRouter } from 'expo-router';
import { useData } from '@/providers/DataProvider';
import { APP_COLORS } from '@/constants/vgp';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  FileText, 
  CheckSquare, 
  Shield,
  ChevronDown,
  X,
  Award,
  Mail,
  ArrowLeft,
  Database,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react-native';
import { CustomFieldTemplate, CheckpointTemplate, StoredUser, UserRole, Client, Qualification, Machine, CustomField, VGPHistory, ScheduledEvent, Intervention, Part, TicketType, Report, ReportInspection, ReportObservation } from '@/types';
import { trpc } from '@/lib/trpc';
import { db } from '@/lib/database';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

type AdminTab = 'users' | 'fields' | 'checkpoints' | 'database';

export default function AdminScreen() {
  const router = useRouter();
  const {
    customFieldTemplates,
    checkpointTemplates,
    addCustomFieldTemplate,
    updateCustomFieldTemplate,
    deleteCustomFieldTemplate,
    machines,
    updateMachine,
    getClient,
    addCheckpointTemplate,
    updateCheckpointTemplate,
    deleteCheckpointTemplate,
    users,
    clients,
    addUser,
    updateUser,
    deleteUser,
    clearAllData,
    deleteSelectedData,
    vgpHistory,
    scheduledEvents,
    interventions,
    parts,
    tickets,
    reports,
    reportInspections,
    reportObservations,
  } = useData();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showAddField, setShowAddField] = useState<boolean>(false);
  const [showAddCheckpoint, setShowAddCheckpoint] = useState<boolean>(false);
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<CustomFieldTemplate | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editingCheckpoint, setEditingCheckpoint] = useState<CheckpointTemplate | null>(null);
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [addingFieldToAll, setAddingFieldToAll] = useState<CustomFieldTemplate | null>(null);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState<boolean>(false);
  const [showConfigureDbModal, setShowConfigureDbModal] = useState<boolean>(false);

  const handleDeleteField = (field: CustomFieldTemplate) => {
    Alert.alert(
      'Supprimer le champ',
      `Voulez-vous vraiment supprimer le champ "${field.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteCustomFieldTemplate(field.id),
        },
      ]
    );
  };

  const handleDeleteCheckpoint = (checkpoint: CheckpointTemplate) => {
    Alert.alert(
      'Supprimer le point de contrôle',
      `Voulez-vous vraiment supprimer "${checkpoint.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteCheckpointTemplate(checkpoint.id),
        },
      ]
    );
  };

  const handleDeleteUser = (user: StoredUser) => {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Voulez-vous vraiment supprimer "${user.email}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteUser(user.id),
        },
      ]
    );
  };

  const handleOpenDeleteDataModal = () => {
    setShowDeleteDataModal(true);
  };

  const activeCheckpoints = checkpointTemplates
    .filter((c) => c.actif)
    .sort((a, b) => a.ordre - b.ordre);
  const inactiveCheckpoints = checkpointTemplates.filter((c) => !c.actif);

  const controleurs = users.filter(u => u.role === 'controleur');
  const admins = users.filter(u => u.role === 'admin');
  const clientUsers = users.filter(u => u.role === 'client');

  React.useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      setDbStatus('checking');
      const isConnected = await db.testConnection();
      setDbStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('[Admin] Error checking database status:', error);
      setDbStatus('disconnected');
    }
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          clients,
          machines,
          vgpHistory,
          customFieldTemplates,
          checkpointTemplates,
          users: users.map(u => ({ ...u, password: undefined })),
          scheduledEvents,
          interventions,
          parts,
          tickets,
          reports,
          reportInspections,
          reportObservations,
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `vgp_export_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        Alert.alert('Succès', 'Base de données exportée avec succès');
      } else {
        const file = new File(Paths.cache, fileName);
        file.create();
        file.write(jsonContent);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exporter la base de données',
        });
        Alert.alert('Succès', 'Base de données exportée avec succès');
      }
    } catch (error) {
      console.error('[Admin] Error exporting database:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter la base de données');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = () => {
    Alert.alert(
      'Importer une base de données',
      'Cette fonctionnalité nécessite de sélectionner un fichier JSON d\'export. Pour l\'instant, vous pouvez exporter vos données et les réimporter manuellement.',
      [
        { text: 'OK' }
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Administration',
          headerStyle: {
            backgroundColor: APP_COLORS.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/dashboard' as never)}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>Gestion des utilisateurs, champs et contrôles</Text>
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Users size={20} color={activeTab === 'users' ? APP_COLORS.primary : APP_COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Utilisateurs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'fields' && styles.tabActive]}
            onPress={() => setActiveTab('fields')}
          >
            <FileText size={20} color={activeTab === 'fields' ? APP_COLORS.primary : APP_COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'fields' && styles.tabTextActive]}>
              Champs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checkpoints' && styles.tabActive]}
            onPress={() => setActiveTab('checkpoints')}
          >
            <CheckSquare size={20} color={activeTab === 'checkpoints' ? APP_COLORS.primary : APP_COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'checkpoints' && styles.tabTextActive]}>
              Contrôles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'database' && styles.tabActive]}
            onPress={() => setActiveTab('database')}
          >
            <Database size={20} color={activeTab === 'database' ? APP_COLORS.primary : APP_COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'database' && styles.tabTextActive]}>
              Base de données
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'users' && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Contrôleurs</Text>
                    <Text style={styles.sectionSubtitle}>
                      Gérez les contrôleurs et leurs qualifications
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddUser(true)}
                  >
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {controleurs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucun contrôleur</Text>
                  </View>
                ) : (
                  controleurs.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={() => setEditingUser(user)}
                      onDelete={() => handleDeleteUser(user)}
                      clients={clients}
                    />
                  ))
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Administrateurs</Text>
                    <Text style={styles.sectionSubtitle}>
                      Comptes avec accès complet au système
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddUser(true)}
                  >
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {admins.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucun administrateur</Text>
                  </View>
                ) : (
                  admins.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={() => setEditingUser(user)}
                      onDelete={() => handleDeleteUser(user)}
                      clients={clients}
                    />
                  ))
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Clients</Text>
                    <Text style={styles.sectionSubtitle}>
                      Accès limité à leurs machines
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddUser(true)}
                  >
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {clientUsers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucun utilisateur client</Text>
                  </View>
                ) : (
                  clientUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={() => setEditingUser(user)}
                      onDelete={() => handleDeleteUser(user)}
                      clients={clients}
                    />
                  ))
                )}
              </View>
            </>
          )}

          {activeTab === 'fields' && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Champs personnalisés</Text>
                    <Text style={styles.sectionSubtitle}>
                      Enrichissez les fiches machines avec des champs supplémentaires
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddField(true)}
                  >
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {customFieldTemplates.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucun champ personnalisé en base de données</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.subsectionTitle}>Champs en base de données ({customFieldTemplates.length})</Text>
                    {customFieldTemplates.map((field) => {
                      const machinesWithField = machines.filter(m => 
                        m.customFields?.some(cf => cf.key === field.key)
                      ).length;
                      const machinesWithoutField = machines.length - machinesWithField;
                      
                      const getTypeLabel = (type: string) => {
                        switch(type) {
                          case 'text': return 'Texte';
                          case 'number': return 'Nombre';
                          case 'date': return 'Date';
                          case 'photo': return 'Photo';
                          case 'pdf': return 'PDF';
                          default: return type;
                        }
                      };
                      
                      return (
                        <View key={field.id} style={styles.itemCard}>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemTitle}>{field.label}</Text>
                            <Text style={styles.itemSubtitle}>
                              Type: {getTypeLabel(field.type)} • Clé: {field.key}
                            </Text>
                            <Text style={styles.itemDate}>
                              Créé le {new Date(field.createdAt).toLocaleDateString('fr-FR')}
                            </Text>
                            <Text style={styles.fieldUsageText}>
                              Utilisé par {machinesWithField}/{machines.length} machine{machines.length > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.itemActions}>
                            {machinesWithoutField > 0 && (
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => setAddingFieldToAll(field)}
                              >
                                <Plus size={18} color="#10B981" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => setEditingField(field)}
                            >
                              <Edit2 size={18} color={APP_COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDeleteField(field)}
                            >
                              <Trash2 size={18} color={APP_COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Fiches machines</Text>
                    <Text style={styles.sectionSubtitle}>
                      Administrez les données de toutes les machines
                    </Text>
                  </View>
                </View>

                {machines.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucune machine</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.subsectionTitle}>Machines ({machines.length})</Text>
                    {machines.map((machine) => {
                      const client = getClient(machine.clientId);
                      return (
                        <TouchableOpacity
                          key={machine.id}
                          style={styles.machineCard}
                          onPress={() => setEditingMachine(machine)}
                        >
                          <View style={styles.machineCardContent}>
                            <View style={styles.machineCardHeader}>
                              <Text style={styles.machineCardTitle}>
                                {machine.constructeur} {machine.modele}
                              </Text>
                              <Edit2 size={18} color={APP_COLORS.primary} />
                            </View>
                            <Text style={styles.machineCardSubtitle}>
                              N° Série: {machine.numeroSerie}
                            </Text>
                            <Text style={styles.machineCardSubtitle}>
                              Client: {client?.nom || 'N/A'}
                            </Text>
                            {machine.customFields && machine.customFields.length > 0 && (
                              <View style={styles.machineFieldsPreview}>
                                <Text style={styles.machineFieldsCount}>
                                  {machine.customFields.length} champ{machine.customFields.length > 1 ? 's' : ''} personnalisé{machine.customFields.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </View>
            </>
          )}

          {activeTab === 'checkpoints' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Points de contrôle VGP</Text>
                  <Text style={styles.sectionSubtitle}>
                    Configurez les points de contrôle pour les sessions VGP
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddCheckpoint(true)}
                >
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {activeCheckpoints.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Points actifs en base de données ({activeCheckpoints.length})</Text>
                  {activeCheckpoints.map((checkpoint) => (
                    <View key={checkpoint.id} style={styles.itemCard}>
                      <View style={styles.checkpointBadge}>
                        <Text style={styles.checkpointNumber}>{checkpoint.ordre}</Text>
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>{checkpoint.label}</Text>
                        <Text style={styles.itemDate}>
                          Créé le {new Date(checkpoint.createdAt).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => setEditingCheckpoint(checkpoint)}
                        >
                          <Edit2 size={18} color={APP_COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteCheckpoint(checkpoint)}
                        >
                          <Trash2 size={18} color={APP_COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {inactiveCheckpoints.length > 0 && (
                <>
                  <Text style={[styles.subsectionTitle, { marginTop: 24 }]}>Points inactifs en base de données ({inactiveCheckpoints.length})</Text>
                  {inactiveCheckpoints.map((checkpoint) => (
                    <View key={checkpoint.id} style={[styles.itemCard, styles.itemCardInactive]}>
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemTitle, styles.itemTitleInactive]}>
                          {checkpoint.label}
                        </Text>
                        <Text style={styles.itemDate}>
                          Créé le {new Date(checkpoint.createdAt).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => setEditingCheckpoint(checkpoint)}
                        >
                          <Edit2 size={18} color={APP_COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteCheckpoint(checkpoint)}
                        >
                          <Trash2 size={18} color={APP_COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {activeCheckpoints.length === 0 && inactiveCheckpoints.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Aucun point de contrôle</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'database' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Base de données</Text>
                  <Text style={styles.sectionSubtitle}>
                    Gérez vos données, la connexion AWS et l&apos;import/export
                  </Text>
                </View>
              </View>

              <View style={styles.dbStatsCard}>
                <Text style={styles.dbStatsTitle}>Données de l&apos;application</Text>
                <View style={styles.dbStatsList}>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Clients</Text>
                    <Text style={styles.dbStatValue}>{clients.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Machines</Text>
                    <Text style={styles.dbStatValue}>{machines.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Contrôles VGP</Text>
                    <Text style={styles.dbStatValue}>{vgpHistory.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Utilisateurs</Text>
                    <Text style={styles.dbStatValue}>{users.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Champs personnalisés</Text>
                    <Text style={styles.dbStatValue}>{customFieldTemplates.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Points de contrôle</Text>
                    <Text style={styles.dbStatValue}>{checkpointTemplates.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Interventions GMAO</Text>
                    <Text style={styles.dbStatValue}>{interventions.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Pièces détachées</Text>
                    <Text style={styles.dbStatValue}>{parts.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Événements planifiés</Text>
                    <Text style={styles.dbStatValue}>{scheduledEvents.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Tickets</Text>
                    <Text style={styles.dbStatValue}>{tickets.length}</Text>
                  </View>
                  <View style={styles.dbStatItem}>
                    <Text style={styles.dbStatLabel}>Rapports importés</Text>
                    <Text style={styles.dbStatValue}>{reports.length}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.dbActionButton, styles.deleteButton, { marginTop: 20 }]}
                  onPress={handleOpenDeleteDataModal}
                >
                  <Trash2 size={18} color="#FFFFFF" />
                  <Text style={styles.dbActionButtonText}>
                    Supprimer des données
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.subsectionHeader}>
                <Text style={styles.subsectionTitle}>Configuration de la base de données</Text>
              </View>

              <View style={styles.dbStatusCard}>
                <View style={styles.dbStatusHeader}>
                  <Database size={24} color={dbStatus === 'connected' ? '#10B981' : '#DC2626'} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.dbStatusTitle}>Statut de la connexion</Text>
                    <Text style={styles.dbStatusSubtitle}>
                      {dbStatus === 'checking' ? 'Vérification en cours...' : 
                       dbStatus === 'connected' ? 'Connecté à la base de données AWS' : 
                       'Déconnecté - Mode données locales'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={checkDatabaseStatus}
                    >
                      <RefreshCw size={20} color={APP_COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.configureButton}
                      onPress={() => setShowConfigureDbModal(true)}
                    >
                      <Text style={styles.configureButtonText}>Configurer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {dbStatus === 'connected' && (
                  <View style={styles.dbConnectionInfo}>
                    <Text style={styles.dbInfoLabel}>Endpoint:</Text>
                    <Text style={styles.dbInfoValue}>{process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || 'Non configuré'}</Text>
                    <Text style={styles.dbInfoLabel}>Namespace:</Text>
                    <Text style={styles.dbInfoValue}>{process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE || 'Non configuré'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.subsectionHeader}>
                <Text style={styles.subsectionTitle}>Import / Export</Text>
              </View>

              <View style={styles.dbActionCard}>
                <View style={styles.dbActionHeader}>
                  <Download size={20} color={APP_COLORS.primary} />
                  <Text style={styles.dbActionTitle}>Exporter la base de données</Text>
                </View>
                <Text style={styles.dbActionDescription}>
                  Téléchargez toutes vos données (clients, machines, contrôles, etc.) dans un fichier JSON. 
                  Ce fichier peut être utilisé pour une sauvegarde ou pour migrer vers un autre système.
                </Text>
                <TouchableOpacity
                  style={[styles.dbActionButton, styles.dbActionButtonPrimary]}
                  onPress={handleExportDatabase}
                  disabled={isExporting}
                >
                  <Download size={18} color="#FFFFFF" />
                  <Text style={styles.dbActionButtonText}>
                    {isExporting ? 'Export en cours...' : 'Exporter toutes les données'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dbActionCard}>
                <View style={styles.dbActionHeader}>
                  <Upload size={20} color={APP_COLORS.primary} />
                  <Text style={styles.dbActionTitle}>Importer des données</Text>
                </View>
                <Text style={styles.dbActionDescription}>
                  Importez des données depuis un fichier JSON d&apos;export. Cette action ajoutera les données 
                  au système existant.
                </Text>
                <TouchableOpacity
                  style={[styles.dbActionButton, styles.dbActionButtonSecondary]}
                  onPress={handleImportDatabase}
                >
                  <Upload size={18} color={APP_COLORS.primary} />
                  <Text style={styles.dbActionButtonTextSecondary}>
                    Importer des données
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </ScrollView>

        <AddUserModal
          visible={showAddUser}
          onClose={() => setShowAddUser(false)}
          onAdd={addUser}
          clients={clients}
        />
        <EditUserModal
          visible={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={updateUser}
          clients={clients}
        />
        <AddFieldModal
          visible={showAddField}
          onClose={() => setShowAddField(false)}
          onAdd={addCustomFieldTemplate}
        />
        <EditFieldModal
          visible={!!editingField}
          field={editingField}
          onClose={() => setEditingField(null)}
          onUpdate={updateCustomFieldTemplate}
        />
        <AddCheckpointModal
          visible={showAddCheckpoint}
          onClose={() => setShowAddCheckpoint(false)}
          onAdd={addCheckpointTemplate}
          nextOrder={activeCheckpoints.length + 1}
        />
        <EditCheckpointModal
          visible={!!editingCheckpoint}
          checkpoint={editingCheckpoint}
          onClose={() => setEditingCheckpoint(null)}
          onUpdate={updateCheckpointTemplate}
        />
        <EditMachineDataModal
          visible={!!editingMachine}
          machine={editingMachine}
          onClose={() => setEditingMachine(null)}
          onUpdate={updateMachine}
          customFieldTemplates={customFieldTemplates}
        />
        <AddFieldToAllMachinesModal
          visible={!!addingFieldToAll}
          field={addingFieldToAll}
          onClose={() => setAddingFieldToAll(null)}
          machines={machines}
          onUpdate={updateMachine}
        />
        <DeleteDataModal
          visible={showDeleteDataModal}
          onClose={() => setShowDeleteDataModal(false)}
          clients={clients}
          machines={machines}
          vgpHistory={vgpHistory}
          customFieldTemplates={customFieldTemplates}
          checkpointTemplates={checkpointTemplates}
          users={users}
          scheduledEvents={scheduledEvents}
          interventions={interventions}
          parts={parts}
          tickets={tickets}
          reports={reports}
          reportInspections={reportInspections}
          reportObservations={reportObservations}
          clearAllData={clearAllData}
          deleteSelectedData={deleteSelectedData}
        />
        <ConfigureDatabaseModal
          visible={showConfigureDbModal}
          onClose={() => setShowConfigureDbModal(false)}
          dbStatus={dbStatus}
        />
      </View>
    </>
  );
}

function QualificationBadge({ qualification }: { qualification: Qualification }) {
  const isExpired = qualification.validUntil && new Date(qualification.validUntil) < new Date();
  const isExpiringSoon = qualification.validUntil && !isExpired && 
    new Date(qualification.validUntil).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000;

  return (
    <View style={[
      styles.qualificationBadge,
      isExpired && styles.qualificationBadgeExpired,
      isExpiringSoon && styles.qualificationBadgeWarning,
    ]}>
      <Text style={[
        styles.qualificationText,
        isExpired && styles.qualificationTextExpired,
        isExpiringSoon && styles.qualificationTextWarning,
      ]}>
        {qualification.name}
      </Text>
      {qualification.validUntil && (
        <Text style={[
          styles.qualificationDateBadgeText,
          isExpired && styles.qualificationTextExpired,
          isExpiringSoon && styles.qualificationTextWarning,
        ]}>
          {isExpired ? 'Expirée' : `Jusqu'au ${new Date(qualification.validUntil).toLocaleDateString('fr-FR')}`}
        </Text>
      )}
    </View>
  );
}

function UserCard({
  user,
  onEdit,
  onDelete,
  clients,
}: {
  user: StoredUser;
  onEdit: () => void;
  onDelete: () => void;
  clients: Client[];
}) {
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'controleur':
        return 'Contrôleur';
      case 'client':
        return 'Client';
      default:
        return role;
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.nom;
  };

  const roleColor = user.role === 'admin' ? APP_COLORS.error : user.role === 'controleur' ? APP_COLORS.primary : '#6B7280';

  return (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={[styles.roleIcon, { backgroundColor: `${roleColor}20` }]}>
          <Shield size={20} color={roleColor} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.email}
          </Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>
                {getRoleLabel(user.role)}
              </Text>
            </View>
            {user.clientId && (
              <Text style={styles.userMetaText}>
                {getClientName(user.clientId) || user.clientId}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Edit2 size={18} color={APP_COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Trash2 size={18} color={APP_COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {user.email && (user.prenom || user.nom) && (
        <View style={styles.userDetail}>
          <Mail size={14} color={APP_COLORS.textSecondary} />
          <Text style={styles.userDetailText}>{user.email}</Text>
        </View>
      )}

      {user.role === 'controleur' && user.qualifications && user.qualifications.length > 0 && (
        <View style={styles.qualificationsContainer}>
          <View style={styles.qualificationsHeader}>
            <Award size={14} color={APP_COLORS.primary} />
            <Text style={styles.qualificationsTitle}>Qualifications</Text>
          </View>
          <View style={styles.qualificationsList}>
            {user.qualifications.map((qual) => (
              <QualificationBadge key={qual.id} qualification={qual} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function AddUserModal({
  visible,
  onClose,
  onAdd,
  clients,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (user: Omit<StoredUser, 'id' | 'createdAt'>) => Promise<StoredUser>;
  clients: Client[];
}) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [nom, setNom] = useState<string>('');
  const [prenom, setPrenom] = useState<string>('');
  const [role, setRole] = useState<UserRole>('controleur');
  const [clientId, setClientId] = useState<string>('');
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [newQualification, setNewQualification] = useState<string>('');
  const [qualificationDate, setQualificationDate] = useState<string>('');
  const [showClientPicker, setShowClientPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendActivationEmail, setSendActivationEmail] = useState<boolean>(true);
  
  const sendEmailMutation = trpc.users.sendActivationEmail.useMutation();

  const handleAddQualification = () => {
    if (newQualification.trim() && !qualifications.some(q => q.name === newQualification.trim())) {
      const newQual: Qualification = {
        id: `qual-${Date.now()}`,
        name: newQualification.trim(),
        validUntil: qualificationDate || undefined,
      };
      setQualifications([...qualifications, newQual]);
      setNewQualification('');
      setQualificationDate('');
    }
  };

  const handleRemoveQualification = (qualId: string) => {
    setQualifications(qualifications.filter(q => q.id !== qualId));
  };

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Email est obligatoire');
      return;
    }

    if (!sendActivationEmail && !password) {
      Alert.alert('Erreur', 'Mot de passe est obligatoire');
      return;
    }

    if (role === 'client' && !clientId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      let userPassword = password;
      let activationToken: string | undefined;
      let activationTokenExpiry: string | undefined;
      let isActivated = true;

      if (sendActivationEmail) {
        activationToken = `act_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);
        activationTokenExpiry = expiryDate.toISOString();
        userPassword = `temp_${Date.now()}`;
        isActivated = false;
      }

      await onAdd({
        email,
        password: userPassword,
        nom: nom || undefined,
        prenom: prenom || undefined,
        role,
        clientId: role === 'client' ? clientId : undefined,
        qualifications: role === 'controleur' && qualifications.length > 0 ? qualifications : undefined,
        activationToken,
        activationTokenExpiry,
        isActivated,
      });

      if (sendActivationEmail && activationToken) {
        try {
          await sendEmailMutation.mutateAsync({
            email,
            activationToken,
            prenom,
            nom,
          });
          Alert.alert(
            'Succès', 
            'Utilisateur créé et email d\'activation envoyé avec succès'
          );
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          Alert.alert(
            'Utilisateur créé',
            'L\'utilisateur a été créé mais l\'envoi de l\'email d\'activation a échoué. Veuillez réessayer depuis la liste des utilisateurs.'
          );
        }
      } else {
        Alert.alert('Succès', 'Utilisateur créé avec succès');
      }

      setEmail('');
      setPassword('');
      setNom('');
      setPrenom('');
      setRole('controleur');
      setClientId('');
      setQualifications([]);
      setSendActivationEmail(true);
      onClose();
    } catch (error) {
      console.error('Error adding user:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvel utilisateur</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rôle *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'admin' && styles.segmentButtonActive]}
                  onPress={() => setRole('admin')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'admin' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'controleur' && styles.segmentButtonActive]}
                  onPress={() => setRole('controleur')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'controleur' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Contrôleur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'client' && styles.segmentButtonActive]}
                  onPress={() => setRole('client')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'client' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Client
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={prenom}
                  onChangeText={setPrenom}
                  placeholder="Jean"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={nom}
                  onChangeText={setNom}
                  placeholder="Dupont"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemple@email.fr"
                placeholderTextColor={APP_COLORS.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setSendActivationEmail(!sendActivationEmail)}
              >
                <View style={[styles.checkboxBox, sendActivationEmail && styles.checkboxBoxActive]}>
                  {sendActivationEmail && <View style={styles.checkboxInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>Envoyer un email d&apos;activation</Text>
                  <Text style={styles.checkboxHint}>
                    L&apos;utilisateur recevra un lien pour créer son mot de passe
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {!sendActivationEmail && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mot de passe *</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  secureTextEntry
                />
              </View>
            )}

            {role === 'client' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Client associé *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowClientPicker(true)}
                >
                  <View style={styles.pickerButton}>
                    <Text style={selectedClient ? styles.pickerText : styles.pickerPlaceholder}>
                      {selectedClient ? selectedClient.nom : 'Sélectionner un client'}
                    </Text>
                    <ChevronDown size={20} color={APP_COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {role === 'controleur' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Qualifications / Habilitations</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={newQualification}
                    onChangeText={setNewQualification}
                    placeholder="Ex: CACES R489"
                    placeholderTextColor={APP_COLORS.textSecondary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Date de validité (optionnelle)</Text>
                  <TextInput
                    style={styles.input}
                    value={qualificationDate}
                    onChangeText={setQualificationDate}
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor={APP_COLORS.textSecondary}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { marginBottom: 16 }]}
                  onPress={handleAddQualification}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>Ajouter</Text>
                </TouchableOpacity>
                {qualifications.length > 0 && (
                  <View style={styles.qualificationsListContainer}>
                    {qualifications.map((qual) => (
                      <View key={qual.id} style={styles.qualificationChip}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qualificationChipText}>{qual.name}</Text>
                          {qual.validUntil && (
                            <Text style={styles.qualificationDateText}>
                              Valide jusqu&apos;au {new Date(qual.validUntil).toLocaleDateString('fr-FR')}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveQualification(qual.id)}>
                          <X size={16} color={APP_COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

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
                {loading ? 'Création...' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <ScrollView style={styles.pickerList}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setClientId(client.id);
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{client.nom}</Text>
                  <Text style={styles.pickerItemSubtext}>{client.contactEmail}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 16 }]}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function EditUserModal({
  visible,
  user,
  onClose,
  onUpdate,
  clients,
}: {
  visible: boolean;
  user: StoredUser | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<StoredUser>) => Promise<void>;
  clients: Client[];
}) {
  const [email, setEmail] = useState<string>(user?.email || '');
  const [password, setPassword] = useState<string>('');
  const [nom, setNom] = useState<string>(user?.nom || '');
  const [prenom, setPrenom] = useState<string>(user?.prenom || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'controleur');
  const [clientId, setClientId] = useState<string>(user?.clientId || '');
  const [qualifications, setQualifications] = useState<Qualification[]>(user?.qualifications || []);
  const [newQualification, setNewQualification] = useState<string>('');
  const [newQualificationCategory, setNewQualificationCategory] = useState<string>('');
  const [qualificationDate, setQualificationDate] = useState<string>('');
  const [editingQualification, setEditingQualification] = useState<Qualification | null>(null);
  const [showClientPicker, setShowClientPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingResetEmail, setSendingResetEmail] = useState<boolean>(false);
  
  const sendPasswordResetMutation = trpc.users.sendPasswordResetEmail.useMutation();

  React.useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPassword('');
      setNom(user.nom || '');
      setPrenom(user.prenom || '');
      setRole(user.role);
      setClientId(user.clientId || '');
      setQualifications(user.qualifications || []);
    }
  }, [user]);

  const handleAddQualification = () => {
    if (newQualification.trim() && !qualifications.some(q => q.name === newQualification.trim())) {
      const newQual: Qualification = {
        id: `qual-${Date.now()}`,
        name: newQualification.trim(),
        category: newQualificationCategory.trim() || undefined,
        validUntil: qualificationDate || undefined,
      };
      setQualifications([...qualifications, newQual]);
      setNewQualification('');
      setNewQualificationCategory('');
      setQualificationDate('');
    }
  };

  const handleRemoveQualification = (qualId: string) => {
    setQualifications(qualifications.filter(q => q.id !== qualId));
  };

  const handleUpdateQualification = (updatedQual: Qualification) => {
    setQualifications(qualifications.map(q => q.id === updatedQual.id ? updatedQual : q));
    setEditingQualification(null);
  };

  const handleSubmit = async () => {
    if (!user || !email) {
      Alert.alert('Erreur', 'Email est obligatoire');
      return;
    }

    if (role === 'client' && !clientId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<StoredUser> = {
        email,
        nom: nom || undefined,
        prenom: prenom || undefined,
        role,
        clientId: role === 'client' ? clientId : undefined,
        qualifications: role === 'controleur' && qualifications.length > 0 ? qualifications : undefined,
      };
      
      if (password) {
        updates.password = password;
      }

      await onUpdate(user.id, updates);
      Alert.alert('Succès', 'Utilisateur modifié avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;

    Alert.alert(
      'Réinitialiser le mot de passe',
      `Voulez-vous envoyer un email de réinitialisation de mot de passe à ${user.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            setSendingResetEmail(true);
            try {
              const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
              const expiryDate = new Date();
              expiryDate.setHours(expiryDate.getHours() + 24);
              const resetTokenExpiry = expiryDate.toISOString();

              await onUpdate(user.id, {
                activationToken: resetToken,
                activationTokenExpiry: resetTokenExpiry,
              });

              await sendPasswordResetMutation.mutateAsync({
                email: user.email,
                resetToken,
                prenom: user.prenom,
                nom: user.nom,
              });

              Alert.alert(
                'Email envoyé',
                `Un email de réinitialisation de mot de passe a été envoyé à ${user.email}`
              );
            } catch (error) {
              console.error('Error sending password reset email:', error);
              Alert.alert(
                'Erreur',
                "L'envoi de l'email de réinitialisation a échoué. Veuillez réessayer."
              );
            } finally {
              setSendingResetEmail(false);
            }
          },
        },
      ]
    );
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier l&apos;utilisateur</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemple@email.fr"
                placeholderTextColor={APP_COLORS.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rôle *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'admin' && styles.segmentButtonActive]}
                  onPress={() => setRole('admin')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'admin' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'controleur' && styles.segmentButtonActive]}
                  onPress={() => setRole('controleur')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'controleur' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Contrôleur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, role === 'client' && styles.segmentButtonActive]}
                  onPress={() => setRole('client')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      role === 'client' && styles.segmentButtonTextActive,
                    ]}
                  >
                    Client
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={prenom}
                  onChangeText={setPrenom}
                  placeholder="Jean"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={nom}
                  onChangeText={setNom}
                  placeholder="Dupont"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordResetHeader}>
                <Text style={styles.label}>Nouveau mot de passe</Text>
                <TouchableOpacity
                  style={styles.sendResetButton}
                  onPress={handleSendPasswordReset}
                  disabled={sendingResetEmail}
                >
                  <Mail size={16} color={APP_COLORS.primary} />
                  <Text style={styles.sendResetButtonText}>
                    {sendingResetEmail ? 'Envoi...' : 'Envoyer un email'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Laisser vide pour ne pas changer"
                placeholderTextColor={APP_COLORS.textSecondary}
                secureTextEntry
              />
              <Text style={styles.helperText}>
                Ou cliquez sur &quot;Envoyer un email&quot; pour que l&apos;utilisateur crée son propre mot de passe
              </Text>
            </View>

            {role === 'client' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Client associé *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowClientPicker(true)}
                >
                  <View style={styles.pickerButton}>
                    <Text style={selectedClient ? styles.pickerText : styles.pickerPlaceholder}>
                      {selectedClient ? selectedClient.nom : 'Sélectionner un client'}
                    </Text>
                    <ChevronDown size={20} color={APP_COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {role === 'controleur' && (
              <>
                {qualifications.length > 0 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Qualifications existantes</Text>
                    <View style={styles.qualificationsEditList}>
                      {qualifications.map((qual) => (
                        <TouchableOpacity
                          key={qual.id}
                          style={styles.qualificationEditChip}
                          onPress={() => setEditingQualification(qual)}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.qualificationChipHeader}>
                              <Text style={styles.qualificationChipText}>{qual.name}</Text>
                              {qual.category && (
                                <View style={styles.categoryBadge}>
                                  <Text style={styles.categoryBadgeText}>{qual.category}</Text>
                                </View>
                              )}
                            </View>
                            {qual.validUntil && (
                              <Text style={styles.qualificationDateText}>
                                Valide jusqu&apos;au {new Date(qual.validUntil).toLocaleDateString('fr-FR')}
                              </Text>
                            )}
                          </View>
                          <Edit2 size={16} color={APP_COLORS.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.sectionTitleSmall}>Créer une nouvelle qualification</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nom de la qualification *</Text>
                    <TextInput
                      style={styles.input}
                      value={newQualification}
                      onChangeText={setNewQualification}
                      placeholder="Ex: CACES R489"
                      placeholderTextColor={APP_COLORS.textSecondary}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Catégorie</Text>
                    <TextInput
                      style={styles.input}
                      value={newQualificationCategory}
                      onChangeText={setNewQualificationCategory}
                      placeholder="Ex: Électrique, Engins, Levage, Contrôle..."
                      placeholderTextColor={APP_COLORS.textSecondary}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date de validité (optionnelle)</Text>
                    <TextInput
                      style={styles.input}
                      value={qualificationDate}
                      onChangeText={setQualificationDate}
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor={APP_COLORS.textSecondary}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary, { marginBottom: 16 }]}
                    onPress={handleAddQualification}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>Ajouter la qualification</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>

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

      {editingQualification && (
        <EditQualificationModal
          visible={true}
          qualification={editingQualification}
          onClose={() => setEditingQualification(null)}
          onUpdate={handleUpdateQualification}
          onDelete={handleRemoveQualification}
        />
      )}

      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <ScrollView style={styles.pickerList}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setClientId(client.id);
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{client.nom}</Text>
                  <Text style={styles.pickerItemSubtext}>{client.contactEmail}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 16 }]}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function EditQualificationModal({
  visible,
  qualification,
  onClose,
  onUpdate,
  onDelete,
}: {
  visible: boolean;
  qualification: Qualification;
  onClose: () => void;
  onUpdate: (qualification: Qualification) => void;
  onDelete: (qualId: string) => void;
}) {
  const [name, setName] = useState<string>(qualification.name);
  const [category, setCategory] = useState<string>(qualification.category || '');
  const [validUntil, setValidUntil] = useState<string>(qualification.validUntil || '');

  React.useEffect(() => {
    setName(qualification.name);
    setCategory(qualification.category || '');
    setValidUntil(qualification.validUntil || '');
  }, [qualification]);

  const handleSave = () => {
    if (name.trim()) {
      onUpdate({
        ...qualification,
        name: name.trim(),
        category: category.trim() || undefined,
        validUntil: validUntil || undefined,
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la qualification',
      `Voulez-vous vraiment supprimer "${qualification.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete(qualification.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la qualification</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom de la qualification *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: CACES R489"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Catégorie</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Ex: Électrique, Engins, Levage, Contrôle..."
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date de validité (optionnelle)</Text>
            <TextInput
              style={styles.input}
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.deleteButton, { marginBottom: 16 }]}
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>Supprimer la qualification</Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddFieldModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (template: { key: string; label: string; type: 'text' | 'number' | 'date' | 'photo' | 'pdf' }) => Promise<CustomFieldTemplate>;
}) {
  const [label, setLabel] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [type, setType] = useState<'text' | 'number' | 'date' | 'photo' | 'pdf'>('text');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!label || !key) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await onAdd({ key, label, type });
      Alert.alert('Succès', 'Champ créé avec succès');
      setLabel('');
      setKey('');
      setType('text');
      onClose();
    } catch (error) {
      console.error('Error adding field:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau champ personnalisé</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Libellé *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Capacité de charge"
              placeholderTextColor={APP_COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Clé technique *</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="Ex: capacite_charge"
              placeholderTextColor={APP_COLORS.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Type de données *</Text>
            <View style={styles.typeGrid}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'text' && styles.typeButtonActive]}
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
                style={[styles.typeButton, type === 'number' && styles.typeButtonActive]}
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
                style={[styles.typeButton, type === 'date' && styles.typeButtonActive]}
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
                style={[styles.typeButton, type === 'photo' && styles.typeButtonActive]}
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
                style={[styles.typeButton, type === 'pdf' && styles.typeButtonActive]}
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
                {loading ? 'Création...' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditFieldModal({
  visible,
  field,
  onClose,
  onUpdate,
}: {
  visible: boolean;
  field: CustomFieldTemplate | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<CustomFieldTemplate>) => Promise<void>;
}) {
  const [label, setLabel] = useState<string>(field?.label || '');
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (field) {
      setLabel(field.label);
    }
  }, [field]);

  const handleSubmit = async () => {
    if (!field || !label) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(field.id, { label });
      Alert.alert('Succès', 'Champ modifié avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating field:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le champ</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Libellé *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Capacité de charge"
              placeholderTextColor={APP_COLORS.textSecondary}
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

function AddCheckpointModal({
  visible,
  onClose,
  onAdd,
  nextOrder,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (template: { label: string; ordre: number; actif: boolean }) => Promise<CheckpointTemplate>;
  nextOrder: number;
}) {
  const [label, setLabel] = useState<string>('');
  const [actif, setActif] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!label) {
      Alert.alert('Erreur', 'Veuillez saisir un libellé');
      return;
    }

    setLoading(true);
    try {
      await onAdd({ label, ordre: nextOrder, actif });
      Alert.alert('Succès', 'Point de contrôle créé avec succès');
      setLabel('');
      setActif(true);
      onClose();
    } catch (error) {
      console.error('Error adding checkpoint:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau point de contrôle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Libellé *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Vérification des freins et systèmes de sécurité"
              placeholderTextColor={APP_COLORS.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setActif(!actif)}
            >
              <View style={[styles.checkboxBox, actif && styles.checkboxBoxActive]}>
                {actif && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.checkboxLabel}>Point actif</Text>
            </TouchableOpacity>
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
                {loading ? 'Création...' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditMachineDataModal({
  visible,
  machine,
  onClose,
  onUpdate,
  customFieldTemplates,
}: {
  visible: boolean;
  machine: Machine | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Machine>) => Promise<void>;
  customFieldTemplates: CustomFieldTemplate[];
}) {
  const [numeroSerie, setNumeroSerie] = useState<string>(machine?.numeroSerie || '');
  const [constructeur, setConstructeur] = useState<string>(machine?.constructeur || '');
  const [modele, setModele] = useState<string>(machine?.modele || '');
  const [dateMiseEnService, setDateMiseEnService] = useState<string>(machine?.dateMiseEnService || '');
  const [typeMachine, setTypeMachine] = useState<'mobile' | 'fixe' | 'presse_plieuse'>(machine?.typeMachine || 'mobile');
  const [periodicite, setPeriodicite] = useState<string>(machine?.periodicite?.toString() || '6');
  const [observations, setObservations] = useState<string>(machine?.observations || '');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (machine) {
      setNumeroSerie(machine.numeroSerie);
      setConstructeur(machine.constructeur);
      setModele(machine.modele);
      setDateMiseEnService(machine.dateMiseEnService);
      setTypeMachine(machine.typeMachine);
      setPeriodicite(machine.periodicite.toString());
      setObservations(machine.observations || '');
      
      const values: Record<string, string> = {};
      if (machine.customFields) {
        machine.customFields.forEach(field => {
          values[field.key] = field.value || '';
        });
      }
      setCustomFieldValues(values);
    }
  }, [machine]);

  const handleSubmit = async () => {
    if (!machine || !numeroSerie || !constructeur || !modele || !dateMiseEnService) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const customFields = customFieldTemplates.map(template => {
        const existingField = machine.customFields?.find(f => f.key === template.key);
        return {
          id: existingField?.id || `field-${template.key}-${Date.now()}`,
          key: template.key,
          label: template.label,
          type: template.type,
          value: customFieldValues[template.key] || '',
        };
      });

      await onUpdate(machine.id, {
        numeroSerie,
        constructeur,
        modele,
        dateMiseEnService,
        typeMachine,
        periodicite: parseInt(periodicite, 10),
        observations,
        customFields,
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la fiche machine</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitleSmall}>Informations générales</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Numéro de série *</Text>
              <TextInput
                style={styles.input}
                value={numeroSerie}
                onChangeText={setNumeroSerie}
                placeholder="Ex: CE-2023-1234"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Constructeur *</Text>
                <TextInput
                  style={styles.input}
                  value={constructeur}
                  onChangeText={setConstructeur}
                  placeholder="Ex: Toyota"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Modèle *</Text>
                <TextInput
                  style={styles.input}
                  value={modele}
                  onChangeText={setModele}
                  placeholder="Ex: Forklift 8FG25"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date de mise en service *</Text>
              <TextInput
                style={styles.input}
                value={dateMiseEnService}
                onChangeText={setDateMiseEnService}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type de machine *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, typeMachine === 'mobile' && styles.segmentButtonActive]}
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
                  style={[styles.segmentButton, typeMachine === 'fixe' && styles.segmentButtonActive]}
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
              <Text style={styles.label}>Périodicité VGP (mois) *</Text>
              <TextInput
                style={styles.input}
                value={periodicite}
                onChangeText={setPeriodicite}
                placeholder="6 ou 12"
                placeholderTextColor={APP_COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Observations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observations}
                onChangeText={setObservations}
                placeholder="Notes diverses..."
                placeholderTextColor={APP_COLORS.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {customFieldTemplates.length > 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.sectionTitleSmall}>Champs personnalisés</Text>
                {customFieldTemplates.map((template) => (
                  <View key={template.id} style={styles.inputContainer}>
                    <Text style={styles.label}>{template.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={customFieldValues[template.key] || ''}
                      onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [template.key]: value }))}
                      placeholder={
                        template.type === 'photo' 
                          ? 'https://exemple.com/photo.jpg'
                          : template.type === 'pdf'
                          ? 'https://exemple.com/document.pdf'
                          : `Saisir ${template.label.toLowerCase()}`
                      }
                      placeholderTextColor={APP_COLORS.textSecondary}
                      keyboardType={template.type === 'number' ? 'numeric' : 'default'}
                      autoCapitalize="none"
                    />
                    {(template.type === 'photo' || template.type === 'pdf') && (
                      <Text style={styles.helperText}>
                        URL du fichier hébergé en ligne
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

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

function EditCheckpointModal({
  visible,
  checkpoint,
  onClose,
  onUpdate,
}: {
  visible: boolean;
  checkpoint: CheckpointTemplate | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<CheckpointTemplate>) => Promise<void>;
}) {
  const [label, setLabel] = useState<string>(checkpoint?.label || '');
  const [actif, setActif] = useState<boolean>(checkpoint?.actif || true);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (checkpoint) {
      setLabel(checkpoint.label);
      setActif(checkpoint.actif);
    }
  }, [checkpoint]);

  const handleSubmit = async () => {
    if (!checkpoint || !label) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(checkpoint.id, { label, actif });
      Alert.alert('Succès', 'Point de contrôle modifié avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le point de contrôle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Libellé *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Vérification des freins et systèmes de sécurité"
              placeholderTextColor={APP_COLORS.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setActif(!actif)}
            >
              <View style={[styles.checkboxBox, actif && styles.checkboxBoxActive]}>
                {actif && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.checkboxLabel}>Point actif</Text>
            </TouchableOpacity>
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

function DeleteDataModal({
  visible,
  onClose,
  clients,
  machines,
  vgpHistory,
  customFieldTemplates,
  checkpointTemplates,
  users,
  scheduledEvents,
  interventions,
  parts,
  tickets,
  reports,
  reportInspections,
  reportObservations,
  clearAllData,
  deleteSelectedData,
}: {
  visible: boolean;
  onClose: () => void;
  clients: Client[];
  machines: Machine[];
  vgpHistory: VGPHistory[];
  customFieldTemplates: CustomFieldTemplate[];
  checkpointTemplates: CheckpointTemplate[];
  users: StoredUser[];
  scheduledEvents: ScheduledEvent[];
  interventions: Intervention[];
  parts: Part[];
  tickets: TicketType[];
  reports: Report[];
  reportInspections: ReportInspection[];
  reportObservations: ReportObservation[];
  clearAllData: () => Promise<void>;
  deleteSelectedData: (selectedTypes: Set<string>) => Promise<void>;
}) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);

  const dataTypes = [
    { key: 'clients', label: 'Clients', count: clients.length },
    { key: 'machines', label: 'Machines', count: machines.length },
    { key: 'vgpHistory', label: 'Historique VGP', count: vgpHistory.length },
    { key: 'users', label: 'Utilisateurs', count: users.length },
    { key: 'customFieldTemplates', label: 'Templates de champs personnalisés', count: customFieldTemplates.length },
    { key: 'checkpointTemplates', label: 'Templates de points de contrôle', count: checkpointTemplates.length },
    { key: 'scheduledEvents', label: 'Événements planifiés', count: scheduledEvents.length },
    { key: 'interventions', label: 'Interventions (GMAO)', count: interventions.length },
    { key: 'parts', label: 'Pièces détachées', count: parts.length },
    { key: 'tickets', label: 'Tickets', count: tickets.length },
    { key: 'reports', label: 'Rapports importés', count: reports.length },
    { key: 'reportInspections', label: 'Inspections de rapports', count: reportInspections.length },
    { key: 'reportObservations', label: 'Observations de rapports', count: reportObservations.length },
  ];

  const toggleSelection = (key: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedTypes(newSet);
  };

  const selectAll = () => {
    setSelectedTypes(new Set(dataTypes.map(dt => dt.key)));
  };

  const deselectAll = () => {
    setSelectedTypes(new Set());
  };

  const handleDelete = async () => {
    if (selectedTypes.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un type de données à supprimer');
      return;
    }

    const selectedLabels = dataTypes
      .filter(dt => selectedTypes.has(dt.key))
      .map(dt => `- ${dt.label} (${dt.count})`)
      .join('\n');

    Alert.alert(
      'Confirmer la suppression',
      `ATTENTION : Cette action est irréversible.\n\nVous allez supprimer :\n${selectedLabels}\n\nVoulez-vous vraiment continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (selectedTypes.size === 13) {
                await clearAllData();
              } else {
                await deleteSelectedData(selectedTypes);
              }

              Alert.alert(
                'Succès',
                `${selectedTypes.size} type(s) de données supprimé(s) avec succès.`
              );
              
              setSelectedTypes(new Set());
              onClose();
            } catch (error) {
              console.error('[DeleteDataModal] Error deleting data:', error);
              Alert.alert('Erreur', 'Impossible de supprimer les données.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supprimer des données</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.deleteDataWarning}>
            <Text style={styles.deleteDataWarningText}>
              ⚠️ Sélectionnez les types de données que vous souhaitez supprimer. Cette action est irréversible.
            </Text>
          </View>

          <View style={styles.deleteDataActions}>
            <TouchableOpacity
              style={styles.deleteDataActionButton}
              onPress={selectAll}
            >
              <Text style={styles.deleteDataActionText}>Tout sélectionner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteDataActionButton}
              onPress={deselectAll}
            >
              <Text style={styles.deleteDataActionText}>Tout désélectionner</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.deleteDataList} showsVerticalScrollIndicator={false}>
            {dataTypes.map((dataType) => (
              <TouchableOpacity
                key={dataType.key}
                style={styles.deleteDataItem}
                onPress={() => toggleSelection(dataType.key)}
                disabled={dataType.count === 0}
              >
                <View style={[
                  styles.deleteDataCheckbox,
                  selectedTypes.has(dataType.key) && styles.deleteDataCheckboxActive,
                  dataType.count === 0 && styles.deleteDataCheckboxDisabled,
                ]}>
                  {selectedTypes.has(dataType.key) && (
                    <View style={styles.deleteDataCheckboxInner} />
                  )}
                </View>
                <View style={styles.deleteDataItemContent}>
                  <Text style={[
                    styles.deleteDataItemLabel,
                    dataType.count === 0 && styles.deleteDataItemLabelDisabled,
                  ]}>
                    {dataType.label}
                  </Text>
                  <Text style={styles.deleteDataItemCount}>
                    {dataType.count} élément{dataType.count > 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={loading || selectedTypes.size === 0}
            >
              <Text style={styles.modalButtonText}>
                {loading ? 'Suppression...' : `Supprimer (${selectedTypes.size})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfigureDatabaseModal({
  visible,
  onClose,
  dbStatus,
}: {
  visible: boolean;
  onClose: () => void;
  dbStatus: 'checking' | 'connected' | 'disconnected';
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configuration de la base de données</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.dbInfoBox}>
              <Text style={styles.dbInfoBoxTitle}>ℹ️ Configuration AWS</Text>
              <Text style={styles.dbInfoBoxText}>
                Pour configurer votre connexion AWS, vous devez définir les variables d&apos;environnement suivantes:
              </Text>
              <Text style={styles.dbInfoBoxCode}>• EXPO_PUBLIC_RORK_DB_ENDPOINT</Text>
              <Text style={styles.dbInfoBoxCode}>• EXPO_PUBLIC_RORK_DB_NAMESPACE</Text>
              <Text style={styles.dbInfoBoxCode}>• EXPO_PUBLIC_RORK_DB_TOKEN</Text>
              <Text style={styles.dbInfoBoxText}>
                Ces paramètres sont actuellement {dbStatus === 'connected' ? 'correctement configurés' : 'non configurés ou invalides'}.
              </Text>
            </View>

            {dbStatus === 'connected' && (
              <View style={styles.connectedInfoBox}>
                <Text style={styles.connectedInfoTitle}>✅ Connexion active</Text>
                <View style={styles.dbConnectionInfoModal}>
                  <Text style={styles.dbInfoLabel}>Endpoint:</Text>
                  <Text style={styles.dbInfoValue}>{process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || 'Non configuré'}</Text>
                  <Text style={styles.dbInfoLabel}>Namespace:</Text>
                  <Text style={styles.dbInfoValue}>{process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE || 'Non configuré'}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddFieldToAllMachinesModal({
  visible,
  field,
  onClose,
  machines,
  onUpdate,
}: {
  visible: boolean;
  field: CustomFieldTemplate | null;
  onClose: () => void;
  machines: Machine[];
  onUpdate: (id: string, updates: Partial<Machine>) => Promise<void>;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [defaultValue, setDefaultValue] = useState<string>('');

  const machinesWithoutField = field 
    ? machines.filter(m => !m.customFields?.some(cf => cf.key === field.key))
    : [];

  const handleAddToAll = async () => {
    if (!field) return;

    setLoading(true);
    try {
      console.log(`[AddFieldToAll] Starting to add field "${field.label}" to ${machinesWithoutField.length} machines`);
      
      const updatePromises = machinesWithoutField.map((machine, index) => {
        const newField: CustomField = {
          id: `field-${field.key}-${machine.id}-${Date.now()}-${index}`,
          key: field.key,
          label: field.label,
          type: field.type,
          value: defaultValue,
        };

        const updatedCustomFields = [...(machine.customFields || []), newField];
        
        console.log(`[AddFieldToAll] Adding field to machine ${machine.numeroSerie} (${machine.id})`);
        
        return onUpdate(machine.id, {
          customFields: updatedCustomFields,
        });
      });

      await Promise.all(updatePromises);
      
      console.log(`[AddFieldToAll] Successfully added field to all ${machinesWithoutField.length} machines`);

      Alert.alert(
        'Succès',
        `Le champ "${field.label}" a été ajouté à ${machinesWithoutField.length} machine${machinesWithoutField.length > 1 ? 's' : ''}`
      );
      setDefaultValue('');
      onClose();
    } catch (error) {
      console.error('[AddFieldToAll] Error adding field to machines:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout du champ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter à toutes les machines</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {field && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Le champ <Text style={{ fontWeight: '700' as const }}>&quot;{field.label}&quot;</Text> sera ajouté à{' '}
                  <Text style={{ fontWeight: '700' as const }}>{machinesWithoutField.length}</Text> machine{machinesWithoutField.length > 1 ? 's' : ''} qui ne l&apos;ont pas encore.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Valeur par défaut (optionnelle)</Text>
                <TextInput
                  style={styles.input}
                  value={defaultValue}
                  onChangeText={setDefaultValue}
                  placeholder={`Valeur par défaut pour ${field.label}`}
                  placeholderTextColor={APP_COLORS.textSecondary}
                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                />
              </View>

              {machinesWithoutField.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Machines concernées :</Text>
                  <ScrollView style={styles.machinesList}>
                    {machinesWithoutField.map((machine) => (
                      <View key={machine.id} style={styles.miniMachineCard}>
                        <Text style={styles.miniMachineText}>
                          {machine.constructeur} {machine.modele}
                        </Text>
                        <Text style={styles.miniMachineSubtext}>
                          N° {machine.numeroSerie}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

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
              onPress={handleAddToAll}
              disabled={loading || machinesWithoutField.length === 0}
            >
              <Text style={styles.modalButtonText}>
                {loading ? 'Ajout en cours...' : 'Ajouter à toutes'}
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
    backgroundColor: APP_COLORS.backgroundLight,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: APP_COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontWeight: '500' as const,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: APP_COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
  },
  tabTextActive: {
    color: APP_COLORS.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: APP_COLORS.cardBackground,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 18,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
  },
  userCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  userMetaText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  userDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  userDetailText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  qualificationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  qualificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  qualificationsTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  qualificationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  qualificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${APP_COLORS.primary}15`,
    borderRadius: 8,
  },
  qualificationText: {
    fontSize: 12,
    color: APP_COLORS.primary,
    fontWeight: '500' as const,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  itemCardInactive: {
    opacity: 0.6,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  itemTitleInactive: {
    textDecorationLine: 'line-through' as const,
  },
  itemSubtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  checkpointBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${APP_COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkpointNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: APP_COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: APP_COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
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
    fontSize: 15,
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
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: APP_COLORS.primary,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  qualificationInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addQualButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${APP_COLORS.primary}15`,
    borderRadius: 10,
  },
  qualificationChipText: {
    fontSize: 13,
    color: APP_COLORS.primary,
    fontWeight: '500' as const,
  },
  qualificationDateText: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  qualificationsListContainer: {
    gap: 8,
  },
  qualificationDateBadgeText: {
    fontSize: 10,
    color: APP_COLORS.primary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  qualificationBadgeExpired: {
    backgroundColor: `${APP_COLORS.error}15`,
  },
  qualificationTextExpired: {
    color: APP_COLORS.error,
  },
  qualificationBadgeWarning: {
    backgroundColor: '#FFA50015',
  },
  qualificationTextWarning: {
    color: '#FFA500',
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  checkboxHint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalButtonTextSecondary: {
    color: APP_COLORS.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
  },
  pickerModal: {
    backgroundColor: APP_COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  pickerItemSubtext: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  qualificationsEditList: {
    gap: 8,
  },
  qualificationEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  qualificationChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: `${APP_COLORS.primary}10`,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: APP_COLORS.primary,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: APP_COLORS.error,
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
  itemDate: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  infoBox: {
    backgroundColor: `${APP_COLORS.primary}10`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: APP_COLORS.primary,
  },
  infoText: {
    fontSize: 13,
    color: APP_COLORS.text,
    lineHeight: 18,
  },
  itemCardDefault: {
    borderColor: `${APP_COLORS.textSecondary}40`,
    borderStyle: 'dashed' as const,
    borderWidth: 2,
  },
  checkpointBadgeDefault: {
    backgroundColor: `${APP_COLORS.textSecondary}20`,
  },
  checkpointNumberDefault: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: APP_COLORS.textSecondary,
  },
  addToDBButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: `${APP_COLORS.primary}10`,
  },
  addToDBButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  machineCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  machineCardContent: {
    flex: 1,
  },
  machineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  machineCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    flex: 1,
  },
  machineCardSubtitle: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  machineFieldsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  machineFieldsCount: {
    fontSize: 12,
    color: APP_COLORS.primary,
    fontWeight: '500' as const,
  },
  fieldUsageText: {
    fontSize: 11,
    color: APP_COLORS.primary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  machinesList: {
    maxHeight: 200,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 8,
  },
  miniMachineCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 8,
    marginBottom: 6,
  },
  miniMachineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  miniMachineSubtext: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  helperText: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  deleteDataWarning: {
    backgroundColor: `${APP_COLORS.error}15`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: APP_COLORS.error,
  },
  deleteDataWarningText: {
    fontSize: 13,
    color: APP_COLORS.text,
    lineHeight: 18,
  },
  deleteDataActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  deleteDataActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
  },
  deleteDataActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  deleteDataList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  deleteDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  deleteDataCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deleteDataCheckboxActive: {
    borderColor: APP_COLORS.error,
    backgroundColor: APP_COLORS.error,
  },
  deleteDataCheckboxDisabled: {
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.backgroundLight,
    opacity: 0.5,
  },
  deleteDataCheckboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  deleteDataItemContent: {
    flex: 1,
  },
  deleteDataItemLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  deleteDataItemLabelDisabled: {
    color: APP_COLORS.textSecondary,
    opacity: 0.5,
  },
  deleteDataItemCount: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  passwordResetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sendResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${APP_COLORS.primary}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${APP_COLORS.primary}30`,
  },
  sendResetButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  dbStatusCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  dbStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dbStatusTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  dbStatusSubtitle: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${APP_COLORS.primary}10`,
  },
  dbConnectionInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  dbInfoLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: APP_COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 2,
  },
  dbInfoValue: {
    fontSize: 13,
    color: APP_COLORS.text,
    fontFamily: 'monospace',
  },
  subsectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  dbActionCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  dbActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dbActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  dbActionDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dbActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  dbActionButtonPrimary: {
    backgroundColor: APP_COLORS.primary,
  },
  dbActionButtonSecondary: {
    backgroundColor: APP_COLORS.background,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
  },
  dbActionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  dbActionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
  },
  dbInfoBox: {
    backgroundColor: `${APP_COLORS.primary}08`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.primary,
  },
  dbInfoBoxTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  dbInfoBoxText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  dbInfoBoxCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: APP_COLORS.primary,
    marginLeft: 8,
    marginBottom: 4,
  },
  dbStatsCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  dbStatsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  dbStatsList: {
    gap: 12,
  },
  dbStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 8,
  },
  dbStatLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  dbStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: APP_COLORS.primary,
  },
  configureButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary,
  },
  configureButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  connectedInfoBox: {
    backgroundColor: `#10B98115`,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  connectedInfoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  dbConnectionInfoModal: {
    marginTop: 8,
  },
});
