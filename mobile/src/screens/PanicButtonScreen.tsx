import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { emergencyApi } from '../services/api';
import { EmergencyAlert, AlertType, AlertStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALERT_TYPES: { key: AlertType; label: string; icon: string }[] = [
  { key: 'panic', label: 'Panic', icon: '!!' },
  { key: 'duress', label: 'Duress', icon: 'D' },
  { key: 'medical', label: 'Medical', icon: '+' },
  { key: 'fire', label: 'Fire', icon: 'F' },
];

const STATUS_COLORS: Record<AlertStatus, { bg: string; text: string }> = {
  active: { bg: '#7f1d1d', text: '#fca5a5' },
  acknowledged: { bg: '#1e3a5f', text: '#93c5fd' },
  dispatched: { bg: '#14532d', text: '#86efac' },
  resolved: { bg: '#1e293b', text: '#94a3b8' },
  false_alarm: { bg: '#422006', text: '#fbbf24' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanicButtonScreen() {
  const navigation = useNavigation<any>();

  // State
  const [selectedType, setSelectedType] = useState<AlertType>('panic');
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);
  const [history, setHistory] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const activePulseAnim = useRef(new Animated.Value(1)).current;
  const buttonGlow = useRef(new Animated.Value(0.3)).current;

  // ---------------------------------------------------------------------------
  // Pulse animation for the panic button
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(buttonGlow, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [buttonGlow]);

  // ---------------------------------------------------------------------------
  // Pulse animation for active alert card
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!activeAlert) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(activePulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeAlert, activePulseAnim]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.allSettled([
        emergencyApi.getActive(),
        emergencyApi.getHistory({ limit: 5 }),
      ]);

      if (activeRes.status === 'fulfilled') {
        const data = activeRes.value.data;
        // API may return a single alert or an array
        if (Array.isArray(data)) {
          const live = data.find(
            (a: EmergencyAlert) =>
              a.status === 'active' || a.status === 'acknowledged' || a.status === 'dispatched',
          );
          setActiveAlert(live || null);
        } else if (data && data.alert_id) {
          setActiveAlert(data);
        } else {
          setActiveAlert(null);
        }
      }

      if (historyRes.status === 'fulfilled') {
        const items = historyRes.value.data?.alerts || historyRes.value.data || [];
        setHistory(Array.isArray(items) ? items.slice(0, 5) : []);
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
  // Trigger Panic
  // ---------------------------------------------------------------------------

  const handlePanic = async () => {
    // Confirmation dialog for safety
    Alert.alert(
      'Confirm Emergency Alert',
      `You are about to trigger a ${selectedType.toUpperCase()} alert. This will notify all supervisors and dispatch immediately.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'TRIGGER ALERT',
          style: 'destructive',
          onPress: triggerAlert,
        },
      ],
    );
  };

  const triggerAlert = async () => {
    setTriggering(true);

    // Animate button press
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Get location
      let latitude: number | undefined;
      let longitude: number | undefined;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        } catch {
          // Location failed but we still send the alert
        }
      }

      const response = await emergencyApi.triggerPanic({
        alert_type: selectedType,
        latitude,
        longitude,
      });

      Alert.alert(
        'Alert Triggered',
        `Your ${selectedType.toUpperCase()} alert has been sent. Help is on the way.\n\nStay calm and remain in a safe position.`,
        [{ text: 'OK' }],
      );

      // Refresh data to show active alert
      await loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        'Failed to send alert. Please try again or call emergency services directly.';
      Alert.alert('Error', msg);
    } finally {
      setTriggering(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Loading emergency system...</Text>
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
          <Text style={styles.headerTitle}>Emergency</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Active Alert Banner */}
        {activeAlert && (
          <Animated.View
            style={[
              styles.activeAlertCard,
              { opacity: activePulseAnim },
            ]}
          >
            <View style={styles.activeAlertHeader}>
              <View style={styles.activeAlertDot} />
              <Text style={styles.activeAlertTitle}>ACTIVE ALERT</Text>
            </View>

            <View style={styles.activeAlertBody}>
              <View style={styles.activeAlertRow}>
                <Text style={styles.activeAlertLabel}>Type</Text>
                <Text style={styles.activeAlertValue}>
                  {activeAlert.alert_type.toUpperCase()}
                </Text>
              </View>

              <View style={styles.activeAlertRow}>
                <Text style={styles.activeAlertLabel}>Triggered</Text>
                <Text style={styles.activeAlertValue}>
                  {formatTimestamp(activeAlert.triggered_at)} ({formatRelativeTime(activeAlert.triggered_at)})
                </Text>
              </View>

              <View style={styles.activeAlertRow}>
                <Text style={styles.activeAlertLabel}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        STATUS_COLORS[activeAlert.status]?.bg || '#1e293b',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          STATUS_COLORS[activeAlert.status]?.text || '#94a3b8',
                      },
                    ]}
                  >
                    {activeAlert.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {activeAlert.acknowledged_at && (
                <View style={styles.activeAlertRow}>
                  <Text style={styles.activeAlertLabel}>Acknowledged</Text>
                  <Text style={styles.activeAlertValue}>
                    {formatTimestamp(activeAlert.acknowledged_at)}
                  </Text>
                </View>
              )}

              {activeAlert.site_name && (
                <View style={styles.activeAlertRow}>
                  <Text style={styles.activeAlertLabel}>Site</Text>
                  <Text style={styles.activeAlertValue}>
                    {activeAlert.site_name}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Alert Type Selector */}
        <Text style={styles.sectionLabel}>Alert Type</Text>
        <View style={styles.typeRow}>
          {ALERT_TYPES.map((type) => {
            const isSelected = selectedType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  isSelected && styles.typeButtonSelected,
                ]}
                onPress={() => setSelectedType(type.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeIcon,
                    isSelected && styles.typeIconSelected,
                  ]}
                >
                  {type.icon}
                </Text>
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PANIC BUTTON */}
        <View style={styles.panicSection}>
          <Animated.View
            style={[
              styles.panicGlow,
              {
                opacity: buttonGlow,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.panicButtonOuter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.panicButton,
                triggering && styles.panicButtonTriggering,
              ]}
              onPress={handlePanic}
              disabled={triggering}
              activeOpacity={0.8}
            >
              {triggering ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.panicButtonIcon}>SOS</Text>
                  <Text style={styles.panicButtonText}>PANIC</Text>
                  <Text style={styles.panicButtonSubtext}>
                    Press to send alert
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.panicHint}>
            Supervisors and dispatch will be notified immediately
          </Text>
        </View>

        {/* History Section */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {history.map((alert) => (
              <View key={alert.alert_id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyType}>
                    {alert.alert_type.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.historyStatusBadge,
                      {
                        backgroundColor:
                          STATUS_COLORS[alert.status]?.bg || '#1e293b',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyStatusText,
                        {
                          color:
                            STATUS_COLORS[alert.status]?.text || '#94a3b8',
                        },
                      ]}
                    >
                      {alert.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyTime}>
                  {formatRelativeTime(alert.triggered_at)}
                  {alert.site_name ? ` -- ${alert.site_name}` : ''}
                </Text>
              </View>
            ))}
          </>
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

  // Active Alert
  activeAlertCard: {
    backgroundColor: '#7f1d1d',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  activeAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activeAlertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  activeAlertTitle: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  activeAlertBody: {
    gap: 10,
  },
  activeAlertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeAlertLabel: {
    color: '#fecaca',
    fontSize: 13,
    opacity: 0.8,
  },
  activeAlertValue: {
    color: '#fef2f2',
    fontSize: 13,
    fontWeight: '600',
  },

  // Status Badge
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

  // Alert Type Selector
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  typeButtonSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#1e1b4b',
  },
  typeIcon: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  typeIconSelected: {
    color: '#a78bfa',
  },
  typeLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  typeLabelSelected: {
    color: '#c4b5fd',
  },

  // Panic Button Section
  panicSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  panicGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#dc2626',
    top: 10,
  },
  panicButtonOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#991b1b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ef4444',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  panicButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fca5a5',
  },
  panicButtonTriggering: {
    backgroundColor: '#991b1b',
  },
  panicButtonIcon: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 2,
  },
  panicButtonText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
  },
  panicButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  panicHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 240,
  },

  // History Section
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
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
    marginBottom: 4,
  },
  historyType: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historyTime: {
    color: '#64748b',
    fontSize: 12,
  },
});
