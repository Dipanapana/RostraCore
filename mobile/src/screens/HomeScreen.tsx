import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../context/authStore';
import { dashboardApi, shiftsApi } from '../services/api';
import { Shift } from '../types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShiftTime(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  return `${format(s, 'HH:mm')} – ${format(e, 'HH:mm')}`;
}

function getShiftDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, d MMM');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split('T')[0];

      const [shiftsRes, statsRes] = await Promise.allSettled([
        shiftsApi.getMyShifts({ start_date: today, end_date: nextWeek }),
        dashboardApi.getGuardDashboard(),
      ]);

      if (shiftsRes.status === 'fulfilled') {
        setUpcomingShifts(shiftsRes.value.data?.shifts || shiftsRes.value.data || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch {
      // Silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'Guard';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#1e1b4b' }]}>
            <Text style={styles.statValue}>
              {stats?.hours_this_week?.toFixed(0) ?? '0'}
            </Text>
            <Text style={styles.statLabel}>Hours This Week</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#1a2e05' }]}>
            <Text style={styles.statValue}>
              {stats?.shifts_this_week ?? upcomingShifts.length}
            </Text>
            <Text style={styles.statLabel}>Shifts Upcoming</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#172554' }]}>
            <Text style={styles.statValue}>
              {stats?.next_payday ?? '–'}
            </Text>
            <Text style={styles.statLabel}>Next Payday</Text>
          </View>
        </View>

        {/* Upcoming Shifts */}
        <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
        {upcomingShifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No shifts scheduled this week</Text>
            <Text style={styles.emptySubtext}>
              Check with your supervisor for assignments
            </Text>
          </View>
        ) : (
          upcomingShifts.slice(0, 5).map((shift) => (
            <TouchableOpacity key={shift.shift_id} style={styles.shiftCard}>
              <View style={styles.shiftHeader}>
                <Text style={styles.shiftDay}>
                  {getShiftDayLabel(shift.start_time)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    shift.assignment_status === 'confirmed'
                      ? styles.statusConfirmed
                      : shift.assignment_status === 'checked_in'
                      ? styles.statusActive
                      : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {shift.assignment_status === 'checked_in'
                      ? 'On Duty'
                      : shift.assignment_status ?? 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.shiftSite}>{shift.site_name}</Text>
              {shift.client_name && (
                <Text style={styles.shiftClient}>{shift.client_name}</Text>
              )}
              <Text style={styles.shiftTime}>
                {formatShiftTime(shift.start_time, shift.end_time)} •{' '}
                {shift.duration_hours?.toFixed(1)}h
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 16,
  },
  name: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  shiftCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shiftDay: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: '#1e3a5f',
  },
  statusActive: {
    backgroundColor: '#14532d',
  },
  statusPending: {
    backgroundColor: '#422006',
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  shiftSite: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
  shiftClient: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  shiftTime: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 6,
  },
});
