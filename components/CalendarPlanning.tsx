import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ScheduledEvent, Machine } from '@/types';
import { APP_COLORS, VGP_COLORS } from '@/constants/vgp';
import { Calendar, Clock, AlertCircle } from 'lucide-react-native';

interface CalendarPlanningProps {
  scheduledEvents: ScheduledEvent[];
  machines?: Machine[];
  onEventPress?: (event: ScheduledEvent) => void;
  onDatePress?: (date: string) => void;
  onMachinePress?: (machineId: string) => void;
}

interface DayEvent {
  date: string;
  scheduledControls: ScheduledEvent[];
  vgpDeadlines: { machine: Machine; event: ScheduledEvent }[];
  isToday: boolean;
  isPast: boolean;
}

export default function CalendarPlanning({
  scheduledEvents,
  machines = [],
  onEventPress,
  onDatePress,
  onMachinePress,
}: CalendarPlanningProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = useMemo(() => {
    const result: DayEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const scheduledControls = scheduledEvents.filter(
        (e) => e.type === 'scheduled_control' && e.scheduledDate === dateStr
      );

      const vgpDeadlines: { machine: Machine; event: ScheduledEvent }[] = [];
      machines.forEach((machine) => {
        if (machine.prochaineVGP === dateStr) {
          const existingEvent = scheduledEvents.find(
            (e) => e.type === 'vgp_deadline' && e.machineId === machine.id
          );
          if (existingEvent) {
            vgpDeadlines.push({ machine, event: existingEvent });
          }
        }
      });

      result.push({
        date: dateStr,
        scheduledControls,
        vgpDeadlines,
        isToday: i === 0,
        isPast: false,
      });
    }

    return result;
  }, [scheduledEvents, machines]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return days.find((d) => d.date === selectedDate);
  }, [selectedDate, days]);

  const formatDate = (dateStr: string, style: 'short' | 'long' = 'short') => {
    const date = new Date(dateStr + 'T00:00:00');
    if (style === 'short') {
      return {
        day: date.getDate().toString(),
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        weekday: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      };
    }
    return {
      full: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  };

  const hasEvents = (day: DayEvent) => {
    return day.scheduledControls.length > 0 || day.vgpDeadlines.length > 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={20} color={APP_COLORS.primary} />
        <Text style={styles.headerTitle}>Planning 30 jours</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysScroll}
        contentContainerStyle={styles.daysContent}
      >
        {days.map((day) => {
          const { day: dayNum, month, weekday } = formatDate(day.date);
          const isSelected = selectedDate === day.date;
          const events = hasEvents(day);

          return (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCard,
                day.isToday && styles.dayCardToday,
                isSelected && styles.dayCardSelected,
              ]}
              onPress={() => {
                setSelectedDate(isSelected ? null : day.date);
                if (onDatePress && !isSelected) {
                  onDatePress(day.date);
                }
              }}
            >
              <Text style={[styles.weekday, isSelected && styles.weekdaySelected]}>
                {weekday}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  day.isToday && styles.dayNumberToday,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {dayNum}
              </Text>
              <Text style={[styles.month, isSelected && styles.monthSelected]}>
                {month}
              </Text>
              {events && (
                <View
                  style={[
                    styles.eventDot,
                    day.vgpDeadlines.length > 0 && styles.eventDotWarning,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedDayData && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsDate}>
            {formatDate(selectedDayData.date, 'long').full}
          </Text>

          {selectedDayData.scheduledControls.length > 0 && (
            <View style={styles.eventSection}>
              <View style={styles.eventSectionHeader}>
                <Clock size={18} color={APP_COLORS.primary} />
                <Text style={styles.eventSectionTitle}>Contrôles programmés</Text>
              </View>
              {selectedDayData.scheduledControls.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventItem}
                  onPress={() => onEventPress?.(event)}
                >
                  <View style={[styles.eventIndicator, { backgroundColor: APP_COLORS.primary }]} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDayData.vgpDeadlines.length > 0 && (
            <View style={styles.eventSection}>
              <View style={styles.eventSectionHeader}>
                <AlertCircle size={18} color={VGP_COLORS.warning} />
                <Text style={styles.eventSectionTitle}>Échéances VGP</Text>
              </View>
              {selectedDayData.vgpDeadlines.map(({ machine, event }) => (
                <TouchableOpacity
                  key={machine.id}
                  style={styles.eventItem}
                  onPress={() => onMachinePress?.(machine.id)}
                >
                  <View style={[styles.eventIndicator, { backgroundColor: VGP_COLORS.warning }]} />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>
                      {machine.constructeur} {machine.modele}
                    </Text>
                    <Text style={styles.eventDescription}>N° {machine.numeroSerie}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!hasEvents(selectedDayData) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun événement prévu</Text>
            </View>
          )}
        </View>
      )}

      {!selectedDate && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Aperçu des 30 prochains jours</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatValue}>
                {scheduledEvents.filter((e) => e.type === 'scheduled_control').length}
              </Text>
              <Text style={styles.summaryStatLabel}>Contrôles</Text>
            </View>
            <View style={styles.summaryStatCard}>
              <Text style={[styles.summaryStatValue, { color: VGP_COLORS.warning }]}>
                {machines.filter((m) => {
                  const deadline = new Date(m.prochaineVGP + 'T00:00:00');
                  const today = new Date();
                  const days30 = new Date(today);
                  days30.setDate(days30.getDate() + 30);
                  return deadline >= today && deadline <= days30;
                }).length}
              </Text>
              <Text style={styles.summaryStatLabel}>Échéances VGP</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: APP_COLORS.text,
    letterSpacing: -0.5,
  },
  daysScroll: {
    marginHorizontal: -16,
  },
  daysContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    width: 70,
    padding: 12,
    borderRadius: 10,
    backgroundColor: APP_COLORS.backgroundLight,
    alignItems: 'center',
    position: 'relative' as const,
  },
  dayCardToday: {
    backgroundColor: '#EFF6FF',
  },
  dayCardSelected: {
    backgroundColor: APP_COLORS.primary,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  weekday: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  weekdaySelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  dayNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: APP_COLORS.text,
    letterSpacing: -0.5,
  },
  dayNumberToday: {
    color: APP_COLORS.primary,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  month: {
    fontSize: 10,
    color: APP_COLORS.textLight,
    textTransform: 'capitalize' as const,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  monthSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventDot: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: APP_COLORS.secondary,
  },
  eventDotWarning: {
    backgroundColor: VGP_COLORS.warning,
  },
  detailsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  detailsDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 16,
    textTransform: 'capitalize' as const,
  },
  eventSection: {
    marginBottom: 16,
  },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: APP_COLORS.backgroundLight,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  eventIndicator: {
    width: 5,
    height: 44,
    borderRadius: 3,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic' as const,
  },
  summaryContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryStatCard: {
    flex: 1,
    padding: 18,
    backgroundColor: APP_COLORS.backgroundLight,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: APP_COLORS.primary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
});
