import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { patrolApi } from '../services/api';
import { PatrolCheckpoint, PatrolRun, PatrolTour } from '../types';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState = 'tours' | 'run';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function progressPercent(run: PatrolRun): number {
  if (!run.total_checkpoints) return 0;
  return Math.round((run.scans_completed / run.total_checkpoints) * 100);
}

function isScanned(run: PatrolRun, checkpoint: PatrolCheckpoint): boolean {
  return run.scans.some((s) => s.checkpoint_id === checkpoint.checkpoint_id);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PatrolScreen() {
  const [view, setView] = useState<ViewState>('tours');
  const [tours, setTours] = useState<PatrolTour[]>([]);
  const [activeRun, setActiveRun] = useState<PatrolRun | null>(null);
  const [activeTour, setActiveTour] = useState<PatrolTour | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);         // GPS fetch in progress
  const [completing, setCompleting] = useState(false);

  // Scan confirmation modal state
  const [pendingCheckpoint, setPendingCheckpoint] = useState<PatrolCheckpoint | null>(null);
  const [scanNotes, setScanNotes] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadTours = useCallback(async () => {
    try {
      const res = await patrolApi.getTours();
      setTours(res.data || []);
    } catch {
      // Silent — show empty state
    }
  }, []);

  useEffect(() => {
    loadTours().finally(() => setLoading(false));
  }, [loadTours]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTours();
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Start patrol run
  // ---------------------------------------------------------------------------

  const handleStartTour = (tour: PatrolTour) => {
    Alert.alert(
      `Start Patrol: ${tour.name}`,
      `${tour.checkpoints.length} checkpoint${tour.checkpoints.length !== 1 ? 's' : ''} to complete.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const res = await patrolApi.startRun({ tour_id: tour.tour_id });
              setActiveRun(res.data);
              setActiveTour(tour);
              setView('run');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not start patrol.');
            }
          },
        },
      ],
    );
  };

  // ---------------------------------------------------------------------------
  // Tap checkpoint → open scan modal
  // ---------------------------------------------------------------------------

  const handleCheckpointPress = (checkpoint: PatrolCheckpoint) => {
    if (!activeRun) return;
    if (isScanned(activeRun, checkpoint)) {
      Alert.alert('Already scanned', `${checkpoint.name} was already recorded.`);
      return;
    }
    setPendingCheckpoint(checkpoint);
    setScanNotes('');
    setShowScanModal(true);
  };

  // ---------------------------------------------------------------------------
  // Confirm scan (get GPS + submit)
  // ---------------------------------------------------------------------------

  const confirmScan = async () => {
    if (!activeRun || !pendingCheckpoint) return;
    setScanning(true);
    setShowScanModal(false);

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch {
      // GPS optional — proceed without
    }

    try {
      const res = await patrolApi.scanCheckpoint(activeRun.run_id, {
        checkpoint_id: pendingCheckpoint.checkpoint_id,
        latitude,
        longitude,
        notes: scanNotes || undefined,
      });

      // Update local run state with new scan
      setActiveRun((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scans_completed: prev.scans_completed + 1,
          scans: [
            ...prev.scans,
            {
              scan_id: res.data.scan_id,
              run_id: res.data.run_id,
              checkpoint_id: res.data.checkpoint_id,
              checkpoint_name: res.data.checkpoint_name,
              scanned_at: res.data.scanned_at,
              latitude: res.data.latitude,
              longitude: res.data.longitude,
            },
          ],
        };
      });
    } catch (err: any) {
      Alert.alert('Scan Failed', err.response?.data?.detail || 'Could not record checkpoint.');
    } finally {
      setScanning(false);
      setPendingCheckpoint(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Complete run
  // ---------------------------------------------------------------------------

  const handleComplete = () => {
    if (!activeRun) return;
    const pct = progressPercent(activeRun);
    const message =
      pct < 100
        ? `You have scanned ${activeRun.scans_completed}/${activeRun.total_checkpoints} checkpoints (${pct}%). Complete anyway?`
        : `All ${activeRun.total_checkpoints} checkpoints scanned. Complete this patrol?`;

    Alert.alert('Complete Patrol', message, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          setCompleting(true);
          try {
            await patrolApi.completeRun(activeRun.run_id);
            Alert.alert('Patrol Complete ✓', 'Great work! Run recorded successfully.');
            setView('tours');
            setActiveRun(null);
            setActiveTour(null);
            await loadTours();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.detail || 'Could not complete patrol.');
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  // ---------------------------------------------------------------------------
  // Abandon run
  // ---------------------------------------------------------------------------

  const handleAbandon = () => {
    if (!activeRun) return;
    Alert.alert(
      'Abandon Patrol',
      'This will mark the patrol as abandoned. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            try {
              await patrolApi.abandonRun(activeRun.run_id);
              setView('tours');
              setActiveRun(null);
              setActiveTour(null);
            } catch {
              Alert.alert('Error', 'Could not abandon patrol.');
            }
          },
        },
      ],
    );
  };

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: active run
  // ---------------------------------------------------------------------------

  if (view === 'run' && activeRun && activeTour) {
    const pct = progressPercent(activeRun);
    const allDone = activeRun.scans_completed >= activeRun.total_checkpoints;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.runHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.runTitle}>{activeTour.name}</Text>
            <Text style={styles.runSubtitle}>
              {activeRun.scans_completed}/{activeRun.total_checkpoints} checkpoints
            </Text>
          </View>
          <TouchableOpacity onPress={handleAbandon} style={styles.abandonBtn}>
            <Text style={styles.abandonBtnText}>Abandon</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{pct}% complete</Text>

        {/* Checkpoints */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTour.checkpoints.map((cp, idx) => {
            const done = isScanned(activeRun, cp);
            const scan = activeRun.scans.find((s) => s.checkpoint_id === cp.checkpoint_id);
            return (
              <TouchableOpacity
                key={cp.checkpoint_id}
                style={[styles.checkpointCard, done && styles.checkpointDone]}
                onPress={() => handleCheckpointPress(cp)}
                disabled={scanning}
              >
                <View style={styles.checkpointLeft}>
                  <View style={[styles.orderBadge, done && styles.orderBadgeDone]}>
                    {done ? (
                      <Text style={styles.orderText}>✓</Text>
                    ) : (
                      <Text style={styles.orderText}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cpName, done && styles.cpNameDone]}>{cp.name}</Text>
                    {cp.description ? (
                      <Text style={styles.cpDesc}>{cp.description}</Text>
                    ) : null}
                    {done && scan ? (
                      <Text style={styles.scannedTime}>
                        Scanned {format(parseISO(scan.scanned_at), 'HH:mm')}
                      </Text>
                    ) : null}
                    {cp.photo_required && !done ? (
                      <Text style={styles.photoRequired}>📷 Photo required</Text>
                    ) : null}
                  </View>
                </View>
                {!done && (
                  <View style={styles.scanBtn}>
                    {scanning && pendingCheckpoint?.checkpoint_id === cp.checkpoint_id ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <Text style={styles.scanBtnText}>Scan</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Complete / status */}
          <TouchableOpacity
            style={[styles.completeBtn, allDone && styles.completeBtnReady]}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeBtnText}>
                {allDone ? '✓ Complete Patrol' : 'Finish Early'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Scan confirmation modal */}
        <Modal
          visible={showScanModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowScanModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Record Checkpoint
              </Text>
              <Text style={styles.modalCheckpointName}>
                {pendingCheckpoint?.name}
              </Text>
              {pendingCheckpoint?.description ? (
                <Text style={styles.modalDesc}>{pendingCheckpoint.description}</Text>
              ) : null}
              <TextInput
                style={styles.notesInput}
                placeholder="Notes (optional)"
                placeholderTextColor="#64748b"
                value={scanNotes}
                onChangeText={setScanNotes}
                multiline
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowScanModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={confirmScan}>
                  <Text style={styles.modalConfirmText}>Confirm Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: tour list
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Patrol Tours</Text>
        <Text style={styles.subtitle}>Select a tour to begin</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
      >
        {tours.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>No patrol tours assigned</Text>
            <Text style={styles.emptySubtext}>
              Your supervisor will set up tours for your site
            </Text>
          </View>
        ) : (
          tours.map((tour) => (
            <TouchableOpacity
              key={tour.tour_id}
              style={styles.tourCard}
              onPress={() => handleStartTour(tour)}
            >
              <View style={styles.tourCardHeader}>
                <Text style={styles.tourName}>{tour.name}</Text>
                <View style={styles.tourBadge}>
                  <Text style={styles.tourBadgeText}>
                    {tour.checkpoints.length} stops
                  </Text>
                </View>
              </View>
              {tour.description ? (
                <Text style={styles.tourDesc}>{tour.description}</Text>
              ) : null}
              <View style={styles.checkpointPreview}>
                {tour.checkpoints.slice(0, 3).map((cp) => (
                  <Text key={cp.checkpoint_id} style={styles.checkpointPreviewItem}>
                    {cp.order_num}. {cp.name}
                  </Text>
                ))}
                {tour.checkpoints.length > 3 ? (
                  <Text style={styles.checkpointPreviewMore}>
                    +{tour.checkpoints.length - 3} more…
                  </Text>
                ) : null}
              </View>
              <View style={styles.startRow}>
                <Text style={styles.startText}>Tap to start →</Text>
              </View>
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // Tour list header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 2 },

  // Tour card
  tourCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tourCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tourName: { color: '#f1f5f9', fontSize: 17, fontWeight: '700', flex: 1 },
  tourBadge: {
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  tourBadgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  tourDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  checkpointPreview: { marginBottom: 10 },
  checkpointPreviewItem: { color: '#cbd5e1', fontSize: 13, marginBottom: 2 },
  checkpointPreviewMore: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
  startRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10, marginTop: 2 },
  startText: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#64748b', fontSize: 13, marginTop: 4, textAlign: 'center' },

  // Run header
  runHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  runTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  runSubtitle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  abandonBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  abandonBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Progress
  progressTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: '#7c3aed', borderRadius: 3 },
  progressLabel: {
    color: '#64748b',
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },

  // Checkpoint cards
  checkpointCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkpointDone: {
    borderColor: '#166534',
    backgroundColor: '#052e16',
  },
  checkpointLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  orderBadgeDone: { backgroundColor: '#166534' },
  orderText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  cpName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  cpNameDone: { color: '#86efac' },
  cpDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  scannedTime: { color: '#4ade80', fontSize: 12, marginTop: 3 },
  photoRequired: { color: '#fbbf24', fontSize: 12, marginTop: 3 },

  scanBtn: {
    backgroundColor: '#4c1d95',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    marginLeft: 10,
  },
  scanBtnText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700' },

  // Complete button
  completeBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  completeBtnReady: { backgroundColor: '#14532d', borderColor: '#166534' },
  completeBtnText: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },

  // Scan modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
  },
  modalTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalCheckpointName: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalDesc: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  notesInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f1f5f9',
    padding: 14,
    fontSize: 14,
    minHeight: 72,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: { color: '#cbd5e1', fontSize: 15, fontWeight: '600' },
  modalConfirm: {
    flex: 2,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
