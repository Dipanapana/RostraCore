import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { loneWorkerApi } from '../services/api';
import { LoneWorkerSession, LoneWorkerStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERVAL_OPTIONS = [15, 30, 60] as const;

const STATUS_COLORS: Record<LoneWorkerStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: '#14532d', text: '#86efac', dot: '#4ade80' },
  overdue: { bg: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  escalated: { bg: '#7f1d1d', text: '#fca5a5', dot: '#dc2626' },
  ended: { bg: '#1e293b', text: '#94a3b8', dot: '#64748b' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 0) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatCountdown(iso: string): { text: string; isOverdue: boolean } {
  const now = Date.now();
  const due = new Date(iso).getTime();
  const diffSec = Math.floor((due - now) / 1000);

  if (diffSec <= 0) {
    const overdueSec = Math.abs(diffSec);
    if (overdueSec < 60) return { text: `${overdueSec}s overdue`, isOverdue: true };
    if (overdueSec < 3600) return { text: `${Math.floor(overdueSec / 60)}m overdue`, isOverdue: true };
    return { text: `${Math.floor(overdueSec / 3600)}h overdue`, isOverdue: true };
  }

  if (diffSec < 60) return { text: `${diffSec}s`, isOverdue: false };
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return { text: `${mins}m ${secs.toString().padStart(2, '0')}s`, isOverdue: false };
  }
  return { text: `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`, isOverdue: false };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffMin = Math.floor((end - start) / 60000);

  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoneWorkerScreen() {
  const navigation = useNavigation<any>();

  // State
  const [activeSession, setActiveSession] = useState<LoneWorkerSession | null>(null);
  const [history, setHistory] = useState<LoneWorkerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<number>(30);
  const [countdown, setCountdown] = useState<{ text: string; isOverdue: boolean }>({
    text: '--:--',
    isOverdue: false,
  });

  // Refs for timers
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.allSettled([
        loneWorkerApi.getActive(),
        loneWorkerApi.getHistory({ limit: 10 }),
      ]);

      if (activeRes.status === 'fulfilled') {
        const data = activeRes.value.data;
        if (data && data.session_id) {
          setActiveSession(data);
        } else if (Array.isArray(data) && data.length > 0) {
          const live = data.find(
            (s: LoneWorkerSession) => s.status === 'active' || s.status === 'overdue' || s.status === 'escalated',
          );
          setActiveSession(live || null);
        } else {
          setActiveSession(null);
        }
      }

      if (historyRes.status === 'fulfilled') {
        const items = historyRes.value.data?.sessions || historyRes.value.data || [];
        setHistory(Array.isArray(items) ? items.slice(0, 10) : []);
      }
    } catch {
      // Silently fail -- user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Auto-refresh every 15 seconds when session is active
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (activeSession) {
      refreshTimerRef.current = setInterval(() => {
        loadData();
      }, 15000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [activeSession, loadData]);

  // ---------------------------------------------------------------------------
  // Countdown timer -- updates every second
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (activeSession && activeSession.next_check_in_due) {
      // Immediate update
      setCountdown(formatCountdown(activeSession.next_check_in_due));

      countdownTimerRef.current = setInterval(() => {
        setCountdown(formatCountdown(activeSession.next_check_in_due));
      }, 1000);
    } else {
      setCountdown({ text: '--:--', isOverdue: false });
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [activeSession]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleStartSession = async () => {
    setStarting(true);
    try {
      await loneWorkerApi.startSession({
        check_in_interval_minutes: selectedInterval,
      });
      await loadData();
      Alert.alert(
        'Session Started',
        `Lone worker protection is now active. You must check in every ${selectedInterval} minutes.`,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        'Failed to start lone worker session. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setStarting(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await loneWorkerApi.checkIn();
      await loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        'Check-in failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleEndSession = () => {
    if (!activeSession) return;

    Alert.alert(
      'End Session',
      'Are you sure you want to end your lone worker protection session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            try {
              await loneWorkerApi.endSession(activeSession.session_id);
              setActiveSession(null);
              await loadData();
              Alert.alert('Session Ended', 'Lone worker protection has been deactivated.');
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail ||
                'Failed to end session. Please try again.';
              Alert.alert('Error', msg);
            } finally {
              setEnding(false);
            }
          },
        },
      ],
    );
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderActiveSession = () => {
    if (!activeSession) return null;

    const statusColor = STATUS_COLORS[activeSession.status] || STATUS_COLORS.active;
    const isOverdue = activeSession.status === 'overdue' || activeSession.status === 'escalated';

    return (
      <View style={[styles.activeCard, isOverdue && styles.activeCardOverdue]}>
        {/* Status header */}
        <View style={styles.activeStatusRow}>
          <View style={styles.activeStatusLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor.dot }]} />
            <Text style={[styles.activeStatusText, { color: statusColor.text }]}>
              {activeSession.status.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
              Level {activeSession.escalation_level}
            </Text>
          </View>
        </View>

        {/* Countdown section */}
        <View style={styles.countdownSection}>
          <Text style={styles.countdownLabel}>Next check-in due</Text>
          <Text
            style={[
              styles.countdownValue,
              countdown.isOverdue ? styles.countdownOverdue : styles.countdownOk,
            ]}
          >
            {countdown.text}
          </Text>
        </View>

        {/* Info rows */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Check-in</Text>
            <Text style={styles.infoValue}>
              {formatRelativeTime(activeSession.last_check_in)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Interval</Text>
            <Text style={styles.infoValue}>
              {activeSession.check_in_interval_minutes}m
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Missed</Text>
            <Text
              style={[
                styles.infoValue,
                activeSession.missed_check_ins > 0 && styles.infoValueDanger,
              ]}
            >
              {activeSession.missed_check_ins}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>
              {formatDuration(activeSession.started_at)}
            </Text>
          </View>
        </View>

        {activeSession.site_name && (
          <View style={styles.siteRow}>
            <Text style={styles.siteLabel}>Site</Text>
            <Text style={styles.siteValue}>{activeSession.site_name}</Text>
          </View>
        )}

        {/* CHECK IN button -- large and prominent */}
        <TouchableOpacity
          style={[styles.checkInButton, checkingIn && styles.buttonDisabled]}
          onPress={handleCheckIn}
          disabled={checkingIn}
          activeOpacity={0.8}
        >
          {checkingIn ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Text style={styles.checkInButtonText}>CHECK IN</Text>
              <Text style={styles.checkInButtonSub}>Tap to confirm you are safe</Text>
            </>
          )}
        </TouchableOpacity>

        {/* End Session button */}
        <TouchableOpacity
          style={[styles.endSessionButton, ending && styles.buttonDisabled]}
          onPress={handleEndSession}
          disabled={ending}
          activeOpacity={0.7}
        >
          {ending ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <Text style={styles.endSessionText}>End Session</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStartSession = () => {
    return (
      <View style={styles.startCard}>
        <Text style={styles.startTitle}>Lone Worker Protection</Text>
        <Text style={styles.startDescription}>
          When working alone, activate this session. You will be required to
          check in at regular intervals. If you miss a check-in, supervisors
          will be alerted and escalation procedures will begin automatically.
        </Text>

        {/* Interval selector */}
        <Text style={styles.intervalLabel}>Check-in Interval</Text>
        <View style={styles.intervalRow}>
          {INTERVAL_OPTIONS.map((mins) => {
            const isSelected = selectedInterval === mins;
            return (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.intervalChip,
                  isSelected && styles.intervalChipSelected,
                ]}
                onPress={() => setSelectedInterval(mins)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.intervalChipText,
                    isSelected && styles.intervalChipTextSelected,
                  ]}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startButton, starting && styles.buttonDisabled]}
          onPress={handleStartSession}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>Start Lone Worker Session</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistory = () => {
    // Filter out the active session from history and only show ended sessions
    const endedSessions = history.filter(
      (s) => s.status === 'ended' && s.session_id !== activeSession?.session_id,
    );

    if (endedSessions.length === 0) return null;

    return (
      <>
        <Text style={styles.sectionTitle}>Session History</Text>
        {endedSessions.map((session) => {
          const statusColor = STATUS_COLORS[session.status] || STATUS_COLORS.ended;

          return (
            <View key={session.session_id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>
                  {formatTimestamp(session.started_at)}
                </Text>
                <View style={[styles.historyBadge, { backgroundColor: statusColor.bg }]}>
                  <Text style={[styles.historyBadgeText, { color: statusColor.text }]}>
                    {session.status}
                  </Text>
                </View>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDetail}>
                  Duration: {formatDuration(session.started_at, session.ended_at)}
                </Text>
                <Text style={styles.historyDetail}>
                  Interval: {session.check_in_interval_minutes}m
                </Text>
                {session.missed_check_ins > 0 && (
                  <Text style={[styles.historyDetail, styles.historyDetailWarn]}>
                    Missed: {session.missed_check_ins}
                  </Text>
                )}
                {session.site_name && (
                  <Text style={styles.historyDetail}>
                    Site: {session.site_name}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading lone worker system...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'<- Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lone Worker</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Active session or start new */}
        {activeSession ? renderActiveSession() : renderStartSession()}

        {/* Session history */}
        {renderHistory()}
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
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },

  // Active Session Card
  activeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  activeCardOverdue: {
    borderColor: '#dc2626',
    backgroundColor: '#1a1625',
  },
  activeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeStatusText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Countdown
  countdownSection: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  countdownLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  countdownValue: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countdownOk: {
    color: '#4ade80',
  },
  countdownOverdue: {
    color: '#ef4444',
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  infoValueDanger: {
    color: '#ef4444',
  },

  // Site row
  siteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  siteLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  siteValue: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  // Check-in button -- large and easy to tap
  checkInButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 80,
  },
  checkInButtonText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  checkInButtonSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // End session button
  endSessionButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endSessionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Start Session Card
  startCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  startTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  startDescription: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },

  // Interval selector
  intervalLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  intervalChip: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  intervalChipSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#1e1b4b',
  },
  intervalChipText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  intervalChipTextSelected: {
    color: '#c4b5fd',
  },

  // Start button
  startButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Section title
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  // History cards
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  historyDetail: {
    color: '#64748b',
    fontSize: 12,
  },
  historyDetailWarn: {
    color: '#fbbf24',
  },
});
