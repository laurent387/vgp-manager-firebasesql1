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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { APP_COLORS, VGP_COLORS, GROUPE_ADF_LOGO } from '@/constants/vgp';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { getVGPStatus, getDaysUntilVGP } from '@/utils/vgp';
import { 
  Building2, 
  LogOut, 
  AlertCircle, 
  ChevronRight,
  Search,
  Settings,
  Filter,
  Wrench,
  FileText,
  Upload,
  Menu,
  X,
} from 'lucide-react-native';
import CalendarPlanning from '@/components/CalendarPlanning';

export default function DashboardScreen() {
  const { user, isAdmin, canViewAllClients, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  
  console.log('Dashboard - User role:', user?.role, 'isAdmin:', isAdmin);
  const { clients, getMachinesByClient, scheduledEvents, users, machines, getEventsByController, getEventsByClient } = useData();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddClient, setShowAddClient] = useState<boolean>(false);
  const [selectedControllerId, setSelectedControllerId] = useState<string | null>(null);
  const [showControllerFilter, setShowControllerFilter] = useState<boolean>(false);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);

  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userClient = canViewAllClients ? null : clients.find((c) => c.id === user?.clientId);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const getClientStats = (clientId: string) => {
    const clientMachines = getMachinesByClient(clientId);
    const overdue = clientMachines.filter(
      (m) => getVGPStatus(m.prochaineVGP) === 'overdue'
    ).length;
    const warning = clientMachines.filter(
      (m) => getVGPStatus(m.prochaineVGP) === 'warning'
    ).length;

    return { total: clientMachines.length, overdue, warning };
  };

  const controllerEvents = user?.role === 'controleur' && user.id
    ? getEventsByController(user.id)
    : [];

  const clientEvents = user?.role === 'client' && userClient
    ? getEventsByClient(userClient.id)
    : [];

  const adminEvents = isAdmin && selectedControllerId
    ? getEventsByController(selectedControllerId)
    : isAdmin
    ? scheduledEvents
    : [];

  const controllers = users.filter(u => u.role === 'controleur');

  if (!canViewAllClients && userClient) {
    const clientMachines = getMachinesByClient(userClient.id);
    const sortedMachines = [...clientMachines].sort((a, b) => {
      const daysA = getDaysUntilVGP(a.prochaineVGP);
      const daysB = getDaysUntilVGP(b.prochaineVGP);
      return daysA - daysB;
    });

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image 
              source={{ uri: GROUPE_ADF_LOGO }}
              style={styles.headerLogoLarge}
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
            <View style={styles.headerTopActions}>
              <TouchableOpacity 
                onPress={() => router.push(`/client/${userClient.id}` as never)} 
                style={styles.menuButton}
              >
                <Settings size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonHeader}>
                <LogOut size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerBottom}>
            <Text style={styles.welcomeText}>Bonjour</Text>
            <Text style={styles.clientName}>{user?.prenom || user?.nom || user?.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.statValue}>{clientMachines.length}</Text>
            <Text style={styles.statLabel}>Machines</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statValue, { color: VGP_COLORS.warning }]}>
              {getClientStats(userClient.id).warning}
            </Text>
            <Text style={styles.statLabel}>À prévoir</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statValue, { color: VGP_COLORS.overdue }]}>
              {getClientStats(userClient.id).overdue}
            </Text>
            <Text style={styles.statLabel}>En retard</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <CalendarPlanning
            scheduledEvents={clientEvents}
            machines={clientMachines}
            onMachinePress={(machineId) => router.push(`/machine/${machineId}` as never)}
          />

          <Text style={styles.sectionTitle}>Parc machines</Text>
          {sortedMachines.map((machine) => {
            const status = getVGPStatus(machine.prochaineVGP);
            const statusColor = VGP_COLORS[status];
            const daysUntil = getDaysUntilVGP(machine.prochaineVGP);

            return (
              <TouchableOpacity
                key={machine.id}
                style={styles.machineCard}
                onPress={() => router.push(`/machine/${machine.id}` as never)}
              >
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <View style={styles.machineInfo}>
                  <Text style={styles.machineName}>
                    {machine.constructeur} {machine.modele}
                  </Text>
                  <Text style={styles.machineSerial}>{machine.numeroSerie}</Text>
                  <View style={styles.vgpInfo}>
                    <AlertCircle size={14} color={statusColor} />
                    <Text style={[styles.vgpText, { color: statusColor }]}>
                      {daysUntil < 0
                        ? `En retard de ${Math.abs(daysUntil)} jours`
                        : `VGP dans ${daysUntil} jours`}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (user?.role === 'controleur') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image 
              source={{ uri: GROUPE_ADF_LOGO }}
              style={styles.headerLogoLarge}
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
            <View style={styles.headerActions}>
              <SyncStatusIndicator />
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonHeader}>
                <LogOut size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerBottom}>
            <Text style={styles.welcomeText}>Bonjour</Text>
            <Text style={styles.clientName}>{user.prenom || user.nom || user.email}</Text>
            <Text style={styles.subtitle}>{clients.length} clients</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={APP_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={APP_COLORS.textSecondary}
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Mes contrôles programmés</Text>
          <CalendarPlanning
            scheduledEvents={controllerEvents}
            machines={machines}
            onMachinePress={(machineId) => router.push(`/machine/${machineId}` as never)}
            onEventPress={(event) => {
              if (event.machineId) {
                router.push(`/machine/${event.machineId}` as never);
              }
            }}
          />

          {controllerEvents.length === 0 && (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>Aucun contrôle programmé</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Base de données clients</Text>
          {filteredClients.map((client) => {
            const stats = getClientStats(client.id);

            return (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCard}
                onPress={() => router.push(`/client/${client.id}` as never)}
              >
                <View style={styles.clientIconContainer}>
                  <Building2 size={24} color={APP_COLORS.primary} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientCardName}>{client.nom}</Text>
                  <Text style={styles.clientContact}>{client.contactPrenom} {client.contactNom}</Text>
                  <View style={styles.clientStats}>
                    <Text style={styles.clientStatText}>{stats.total} machines</Text>
                    {stats.overdue > 0 && (
                      <>
                        <Text style={styles.clientStatDot}>•</Text>
                        <Text style={[styles.clientStatText, { color: VGP_COLORS.overdue }]}>
                          {stats.overdue} en retard
                        </Text>
                      </>
                    )}
                    {stats.warning > 0 && (
                      <>
                        <Text style={styles.clientStatDot}>•</Text>
                        <Text style={[styles.clientStatText, { color: VGP_COLORS.warning }]}>
                          {stats.warning} à prévoir
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <ChevronRight size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image 
            source={{ uri: GROUPE_ADF_LOGO }}
            style={styles.headerLogoLarge}
            resizeMode="contain"
          />
          <View style={styles.headerTopActions}>
            {!isLargeScreen && (canViewAllClients || isAdmin) && (
              <TouchableOpacity 
                onPress={() => setShowActionsMenu(!showActionsMenu)} 
                style={styles.menuButton}
              >
                {showActionsMenu ? (
                  <X size={24} color="#FFFFFF" />
                ) : (
                  <Menu size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonHeader}>
              <LogOut size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.welcomeText}>Tableau de bord</Text>
          <Text style={styles.subtitle}>{clients.length} clients</Text>
        </View>
        {isLargeScreen && (canViewAllClients || isAdmin) && (
          <View style={styles.navigationTabs}>
            {canViewAllClients && (
              <TouchableOpacity 
                onPress={() => router.push('/reports' as never)} 
                style={styles.navTab}
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.navTabText}>Rapports</Text>
              </TouchableOpacity>
            )}
            {canViewAllClients && (
              <TouchableOpacity 
                onPress={() => router.push('/import-report' as never)} 
                style={styles.navTab}
              >
                <Upload size={18} color="#FFFFFF" />
                <Text style={styles.navTabText}>Import</Text>
              </TouchableOpacity>
            )}
            {canViewAllClients && (
              <TouchableOpacity 
                onPress={() => router.push('/gmao' as never)} 
                style={styles.navTab}
              >
                <Wrench size={18} color="#FFFFFF" />
                <Text style={styles.navTabText}>GMAO</Text>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => router.push('/admin' as never)} 
                style={styles.navTab}
              >
                <Settings size={18} color="#FFFFFF" />
                <Text style={styles.navTabText}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {!isLargeScreen && showActionsMenu && (
        <View style={styles.actionsMenu}>
          {canViewAllClients && (
            <TouchableOpacity 
              onPress={() => {
                setShowActionsMenu(false);
                router.push('/reports' as never);
              }} 
              style={styles.actionItem}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                <FileText size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Rapports</Text>
              <ChevronRight size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {canViewAllClients && (
            <TouchableOpacity 
              onPress={() => {
                setShowActionsMenu(false);
                router.push('/import-report' as never);
              }} 
              style={styles.actionItem}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                <Upload size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Import</Text>
              <ChevronRight size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {canViewAllClients && (
            <TouchableOpacity 
              onPress={() => {
                setShowActionsMenu(false);
                router.push('/gmao' as never);
              }} 
              style={styles.actionItem}
            >
              <View style={[styles.actionIcon, { backgroundColor: APP_COLORS.secondary }]}>
                <Wrench size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>GMAO</Text>
              <ChevronRight size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity 
              onPress={() => {
                setShowActionsMenu(false);
                router.push('/admin' as never);
              }} 
              style={styles.actionItem}
            >
              <View style={[styles.actionIcon, { backgroundColor: APP_COLORS.primary }]}>
                <Settings size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Admin</Text>
              <ChevronRight size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {(!showActionsMenu || isLargeScreen) && (
        <View style={styles.searchContainer}>
          <Search size={20} color={APP_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={APP_COLORS.textSecondary}
          />
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.planningHeader}>
          <Text style={styles.sectionTitle}>Planning</Text>
          {controllers.length > 0 && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowControllerFilter(!showControllerFilter)}
            >
              <Filter size={16} color={APP_COLORS.primary} />
              <Text style={styles.filterButtonText}>
                {selectedControllerId
                  ? controllers.find(c => c.id === selectedControllerId)?.nom || 'Filtre'
                  : 'Tous'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showControllerFilter && (
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !selectedControllerId && styles.filterOptionActive]}
              onPress={() => {
                setSelectedControllerId(null);
                setShowControllerFilter(false);
              }}
            >
              <Text style={[styles.filterOptionText, !selectedControllerId && styles.filterOptionTextActive]}>
                Tous les contrôleurs
              </Text>
            </TouchableOpacity>
            {controllers.map((controller) => (
              <TouchableOpacity
                key={controller.id}
                style={[styles.filterOption, selectedControllerId === controller.id && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedControllerId(controller.id);
                  setShowControllerFilter(false);
                }}
              >
                <Text style={[styles.filterOptionText, selectedControllerId === controller.id && styles.filterOptionTextActive]}>
                  {controller.nom || controller.email}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <CalendarPlanning
          scheduledEvents={adminEvents}
          machines={machines}
          onMachinePress={(machineId) => router.push(`/machine/${machineId}` as never)}
          onEventPress={(event) => {
            if (event.machineId) {
              router.push(`/machine/${event.machineId}` as never);
            }
          }}
        />

        <Text style={styles.sectionTitle}>Clients</Text>
        {filteredClients.map((client) => {
          const stats = getClientStats(client.id);

          return (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              onPress={() => router.push(`/client/${client.id}` as never)}
            >
              <View style={styles.clientIconContainer}>
                <Building2 size={24} color={APP_COLORS.primary} />
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientCardName}>{client.nom}</Text>
                <Text style={styles.clientContact}>{client.contactPrenom} {client.contactNom}</Text>
                <View style={styles.clientStats}>
                  <Text style={styles.clientStatText}>{stats.total} machines</Text>
                  {stats.overdue > 0 && (
                    <>
                      <Text style={styles.clientStatDot}>•</Text>
                      <Text style={[styles.clientStatText, { color: VGP_COLORS.overdue }]}>
                        {stats.overdue} en retard
                      </Text>
                    </>
                  )}
                  {stats.warning > 0 && (
                    <>
                      <Text style={styles.clientStatDot}>•</Text>
                      <Text style={[styles.clientStatText, { color: VGP_COLORS.warning }]}>
                        {stats.warning} à prévoir
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <AddClientModal visible={showAddClient} onClose={() => setShowAddClient(false)} />
      <ControllerFilterModal
        visible={showControllerFilter}
        onClose={() => setShowControllerFilter(false)}
        controllers={controllers}
        selectedId={selectedControllerId}
        onSelect={(id) => {
          setSelectedControllerId(id);
          setShowControllerFilter(false);
        }}
      />
    </View>
  );
}

function AddClientModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addClient } = useData();
  const [nom, setNom] = useState<string>('');
  const [adresse, setAdresse] = useState<string>('');
  const [contactNom, setContactNom] = useState<string>('');
  const [contactPrenom, setContactPrenom] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactTelephone, setContactTelephone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!nom || !adresse || !contactNom || !contactPrenom || !contactEmail || !contactTelephone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await addClient({ nom, adresse, contactNom, contactPrenom, contactEmail, contactTelephone });
      Alert.alert('Succès', 'Client ajouté avec succès');
      setNom('');
      setAdresse('');
      setContactNom('');
      setContactPrenom('');
      setContactEmail('');
      setContactTelephone('');
      onClose();
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nouveau client</Text>

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
    backgroundColor: APP_COLORS.backgroundLight,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: APP_COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLogoLarge: {
    width: 180,
    height: 60,
  },
  headerTopActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerBottom: {
    gap: 4,
    marginBottom: 8,
  },
  navigationTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500' as const,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsMenu: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 16,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    borderRadius: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  roleIndicator: {
    fontSize: 12,
    color: APP_COLORS.accent,
    fontWeight: '700' as const,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  gmaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: APP_COLORS.secondary,
  },
  gmaoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
  },
  reportsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: APP_COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: APP_COLORS.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clientIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clientInfo: {
    flex: 1,
  },
  clientCardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  clientContact: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  clientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  clientStatText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  clientStatDot: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginHorizontal: 6,
  },
  machineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 5,
    height: 52,
    borderRadius: 3,
    marginRight: 14,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  machineSerial: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  vgpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  vgpText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: APP_COLORS.primary,
    marginBottom: 28,
    letterSpacing: -0.5,
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
    backgroundColor: APP_COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: APP_COLORS.text,
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
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonSecondary: {
    backgroundColor: APP_COLORS.backgroundLight,
    borderWidth: 2,
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
  planningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '600' as const,
  },
  filterOptions: {
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: APP_COLORS.primary,
  },
  filterOptionText: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  emptyStateCard: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
  },
});

function ControllerFilterModal({
  visible,
  onClose,
  controllers,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  controllers: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtrer par contrôleur</Text>

          <ScrollView style={{ maxHeight: 300 }}>
            <TouchableOpacity
              style={[styles.filterOption, !selectedId && styles.filterOptionActive]}
              onPress={() => onSelect(null)}
            >
              <Text style={[styles.filterOptionText, !selectedId && styles.filterOptionTextActive]}>
                Tous les contrôleurs
              </Text>
            </TouchableOpacity>
            {controllers.map((controller) => (
              <TouchableOpacity
                key={controller.id}
                style={[styles.filterOption, selectedId === controller.id && styles.filterOptionActive]}
                onPress={() => onSelect(controller.id)}
              >
                <Text style={[styles.filterOptionText, selectedId === controller.id && styles.filterOptionTextActive]}>
                  {controller.nom || controller.email}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 16 }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonTextSecondary}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
