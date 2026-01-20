import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { APP_COLORS, GROUPE_ADF_LOGO } from '@/constants/vgp';
import {
  Wrench,
  Package,
  AlertCircle,
  TrendingUp,
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';

export default function GMAOScreen() {
  const { user, canViewAllClients } = useAuth();
  const {
    interventions,
    parts,
    tickets,
    machines,
    clients,
  } = useData();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const userClient = canViewAllClients ? null : clients.find((c) => c.id === user?.clientId);

  const filteredInterventions = canViewAllClients
    ? interventions
    : interventions.filter((i) => i.clientId === userClient?.id);

  const filteredTickets = canViewAllClients
    ? tickets
    : tickets.filter((t) => t.clientId === userClient?.id);

  const stats = {
    totalInterventions: filteredInterventions.length,
    plannedInterventions: filteredInterventions.filter((i) => i.status === 'planned').length,
    inProgressInterventions: filteredInterventions.filter((i) => i.status === 'in_progress').length,
    completedInterventions: filteredInterventions.filter((i) => i.status === 'completed').length,
    openTickets: filteredTickets.filter((t) => t.status === 'open' || t.status === 'assigned').length,
    lowStockParts: parts.filter((p) => p.stockQuantity <= p.minStockLevel).length,
    totalParts: parts.length,
  };

  const recentInterventions = [...filteredInterventions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const urgentTickets = filteredTickets
    .filter((t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'closed')
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return '#3B82F6';
      case 'in_progress':
        return '#F59E0B';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#6B7280';
      default:
        return APP_COLORS.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planifiée';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return APP_COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: {
            backgroundColor: APP_COLORS.primary,
          },
          headerTintColor: '#FFFFFF',
          headerLeft: () => null,
          headerTitle: () => (
            <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Image 
                source={{ uri: GROUPE_ADF_LOGO }}
                style={{ width: 120, height: 35 }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>GMAO - Maintenance</Text>
        <Text style={styles.headerSubtitle}>Gestion de la maintenance assistée par ordinateur</Text>
      </View>

      <View style={[styles.searchContainer, { marginTop: 0 }]}>
        <Search size={20} color={APP_COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={APP_COLORS.textSecondary}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <View style={styles.statIcon}>
              <Calendar size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {stats.plannedInterventions}
            </Text>
            <Text style={styles.statLabel}>Planifiées</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <View style={styles.statIcon}>
              <Clock size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {stats.inProgressInterventions}
            </Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <View style={styles.statIcon}>
              <CheckCircle2 size={24} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.completedInterventions}
            </Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <View style={styles.statIcon}>
              <AlertCircle size={24} color="#DC2626" />
            </View>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.openTickets}</Text>
            <Text style={styles.statLabel}>Tickets ouverts</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/gmao/interventions' as never)}
            >
              <Wrench size={28} color="#3B82F6" />
              <Text style={styles.actionLabel}>Interventions</Text>
              <Text style={styles.actionCount}>{stats.totalInterventions}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/gmao/parts' as never)}
            >
              <Package size={28} color="#10B981" />
              <Text style={styles.actionLabel}>Pièces</Text>
              <Text style={styles.actionCount}>{stats.totalParts}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/gmao/tickets' as never)}
            >
              <AlertCircle size={28} color="#F59E0B" />
              <Text style={styles.actionLabel}>Tickets</Text>
              <Text style={styles.actionCount}>{filteredTickets.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/gmao/analytics' as never)}
            >
              <TrendingUp size={28} color="#8B5CF6" />
              <Text style={styles.actionLabel}>Indicateurs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {urgentTickets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tickets urgents</Text>
              <TouchableOpacity onPress={() => router.push('/gmao/tickets' as never)}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {urgentTickets.map((ticket) => {
              const machine = machines.find((m) => m.id === ticket.machineId);
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  onPress={() => router.push(`/gmao/tickets/${ticket.id}` as never)}
                >
                  <View
                    style={[
                      styles.priorityIndicator,
                      { backgroundColor: getPriorityColor(ticket.priority) },
                    ]}
                  />
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketTitle}>{ticket.title}</Text>
                    <Text style={styles.ticketMachine}>
                      {machine ? `${machine.constructeur} ${machine.modele}` : 'Machine inconnue'}
                    </Text>
                    <Text style={styles.ticketDate}>
                      Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <ArrowRight size={20} color={APP_COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interventions récentes</Text>
            <TouchableOpacity onPress={() => router.push('/gmao/interventions' as never)}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {recentInterventions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucune intervention pour le moment</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/gmao/interventions/new' as never)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Créer une intervention</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentInterventions.map((intervention) => {
              const machine = machines.find((m) => m.id === intervention.machineId);
              const statusColor = getStatusColor(intervention.status);
              return (
                <TouchableOpacity
                  key={intervention.id}
                  style={styles.interventionCard}
                  onPress={() => router.push(`/gmao/interventions/${intervention.id}` as never)}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                  <View style={styles.interventionInfo}>
                    <Text style={styles.interventionTitle}>{intervention.title}</Text>
                    <Text style={styles.interventionMachine}>
                      {machine ? `${machine.constructeur} ${machine.modele}` : 'Machine inconnue'}
                    </Text>
                    <View style={styles.interventionMeta}>
                      <View
                        style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}
                      >
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {getStatusLabel(intervention.status)}
                        </Text>
                      </View>
                      {intervention.scheduledDate && (
                        <Text style={styles.interventionDate}>
                          {new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ArrowRight size={20} color={APP_COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {stats.lowStockParts > 0 && (
          <View style={styles.alertCard}>
            <AlertCircle size={24} color="#F59E0B" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Stock faible</Text>
              <Text style={styles.alertText}>
                {stats.lowStockParts} pièce{stats.lowStockParts > 1 ? 's' : ''} en rupture ou
                faible stock
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/gmao/parts' as never)}>
              <ArrowRight size={20} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {canViewAllClients && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/gmao/interventions/new' as never)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginTop: 12,
  },
  actionCount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: APP_COLORS.primary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '600' as const,
  },
  interventionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statusIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  interventionInfo: {
    flex: 1,
  },
  interventionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  interventionMachine: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  interventionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  interventionDate: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  priorityIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  ticketMachine: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  alertText: {
    fontSize: 14,
    color: '#92400E',
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    backgroundColor: APP_COLORS.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  emptyStateText: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
