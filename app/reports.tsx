import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useData } from '@/providers/DataProvider';
import { useAuth } from '@/providers/AuthProvider';
import { APP_COLORS } from '@/constants/vgp';
import { FileText, Calendar, Building2, Package, AlertCircle, ChevronRight } from 'lucide-react-native';
import { Report } from '@/types';

export default function ReportsListScreen() {
  const { user, canViewAllClients } = useAuth();
  const { reports, clients, getInspectionsByReport, getClient } = useData();

  const userClient = !canViewAllClients && user?.clientId
    ? clients.find((c) => c.id === user.clientId)
    : null;

  const filteredReports = canViewAllClients
    ? reports
    : reports.filter((r) => r.clientId === userClient?.id);

  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  };

  const getReportStats = (report: Report) => {
    const inspections = getInspectionsByReport(report.id);
    const machinesCount = inspections.length;
    const hasObservations = report.has_observations || false;
    return { machinesCount, hasObservations };
  };

  const renderReportCard = (report: Report) => {
    const client = getClient(report.clientId);
    const stats = getReportStats(report);

    return (
      <TouchableOpacity
        key={report.id}
        style={styles.card}
        onPress={() => {}}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={24} color={APP_COLORS.primary} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardTitle}>{report.report_number}</Text>
              <Text style={styles.cardSubtitle}>{client?.nom || 'Client inconnu'}</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </View>

        <View style={styles.cardBody}>
          {report.organisme && (
            <View style={styles.cardRow}>
              <Building2 size={16} color="#6b7280" />
              <Text style={styles.cardRowText}>{report.organisme}</Text>
            </View>
          )}

          {report.date_verification && (
            <View style={styles.cardRow}>
              <Calendar size={16} color="#6b7280" />
              <Text style={styles.cardRowText}>
                Vérification: {formatDate(report.date_verification)}
              </Text>
            </View>
          )}

          <View style={styles.cardRow}>
            <Package size={16} color="#6b7280" />
            <Text style={styles.cardRowText}>
              {stats.machinesCount} machine{stats.machinesCount > 1 ? 's' : ''}
            </Text>
          </View>

          {stats.hasObservations && (
            <View style={styles.cardRow}>
              <AlertCircle size={16} color="#f59e0b" />
              <Text style={[styles.cardRowText, { color: '#f59e0b' }]}>
                Contient des observations
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            Importé le {formatDate(report.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Rapports importés',
          headerStyle: { backgroundColor: APP_COLORS.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sortedReports.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Aucun rapport importé</Text>
            <Text style={styles.emptyText}>
              Les rapports importés apparaîtront ici
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {sortedReports.length} rapport{sortedReports.length > 1 ? 's' : ''}
              </Text>
            </View>
            {sortedReports.map(renderReportCard)}
          </>
        )}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRowText: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cardFooterText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
