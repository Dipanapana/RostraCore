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
import { shiftsApi } from '../services/api';
import { Shift } from '../types';
import { format, startOfWeek, endOfWeek, addWeeks, parseISO, isSameDay } from 'date-fns';

export default function ScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const loadShifts = useCallback(async () => {
    try {
      const res = await shiftsApi.getMyShifts({
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
      });
      setShifts(res.data?.shifts || res.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    loadShifts();
  }, [loadShifts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  };

  // Group shifts by day
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getShiftsForDay = (date: Date): Shift[] =>
    shifts.filter((s) => isSameDay(parseISO(s.start_time), date));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={() => setWeekOffset((o) => o - 1)}
          style={styles.weekNavButton}
        >
          <Text style={styles.weekNavText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.weekNavCenter}>
          <Text style={styles.weekLabel}>
            {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
          </Text>
          {weekOffset === 0 && (
            <Text style={styles.weekCurrent}>This Week</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setWeekOffset((o) => o + 1)}
          style={styles.weekNavButton}
        >
          <Text style={styles.weekNavText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
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
          {days.map((date) => {
            const dayShifts = getShiftsForDay(date);
            const isToday = isSameDay(date, new Date());

            return (
              <View key={date.toISOString()} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text
                    style={[
                      styles.dayName,
                      isToday && styles.dayNameActive,
                    ]}
                  >
                    {format(date, 'EEEE')}
                  </Text>
                  <Text style={styles.dayDate}>{format(date, 'd MMM')}</Text>
                  {isToday && <View style={styles.todayDot} />}
                </View>

                {dayShifts.length === 0 ? (
                  <View style={styles.noShift}>
                    <Text style={styles.noShiftText}>No shifts</Text>
                  </View>
                ) : (
                  dayShifts.map((shift) => (
                    <View key={shift.shift_id} style={styles.shiftCard}>
                      <View style={styles.shiftTimeColumn}>
                        <Text style={styles.shiftStartTime}>
                          {format(parseISO(shift.start_time), 'HH:mm')}
                        </Text>
                        <View style={styles.timeLine} />
                        <Text style={styles.shiftEndTime}>
                          {format(parseISO(shift.end_time), 'HH:mm')}
                        </Text>
                      </View>
                      <View style={styles.shiftDetails}>
                        <Text style={styles.shiftSite}>{shift.site_name}</Text>
                        {shift.client_name && (
                          <Text style={styles.shiftClient}>
                            {shift.client_name}
                          </Text>
                        )}
                        <Text style={styles.shiftDuration}>
                          {shift.duration_hours?.toFixed(1)}h shift
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
  },
  weekNavCenter: {
    alignItems: 'center',
  },
  weekLabel: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
  weekCurrent: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dayName: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  dayNameActive: {
    color: '#a78bfa',
  },
  dayDate: {
    color: '#64748b',
    fontSize: 13,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
  },
  noShift: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  noShiftText: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
  shiftCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  shiftTimeColumn: {
    alignItems: 'center',
    width: 48,
  },
  shiftStartTime: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '700',
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
    borderRadius: 1,
  },
  shiftEndTime: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  shiftDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  shiftSite: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  shiftClient: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  shiftDuration: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
