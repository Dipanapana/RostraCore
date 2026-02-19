import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { leaveApi } from '../services/api';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaveRequest {
  leave_id: number;
  employee_id: number;
  employee_name: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason: string | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  family: 'Family Responsibility',
  unpaid: 'Unpaid Leave',
  study: 'Study Leave',
  maternity: 'Maternity Leave',
  other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:  { bg: '#1c1400', text: '#fbbf24', border: '#fbbf2440' },
  approved: { bg: '#0a1a0a', text: '#4ade80', border: '#4ade8040' },
  rejected: { bg: '#1c0000', text: '#f87171', border: '#f8717140' },
};

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return iso; }
}

function fmtAgo(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); } catch { return ''; }
}

// ---------------------------------------------------------------------------
// Leave card
// ---------------------------------------------------------------------------

function LeaveCard({
  item,
  onApprove,
  onReject,
}: {
  item: LeaveRequest;
  onApprove: (id: number) => void;
  onReject: (id: number, name: string) => void;
}) {
  const col = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
  const typeLabel = LEAVE_TYPE_LABELS[item.leave_type] ?? item.leave_type;

  return (
    <View style={[styles.card, { backgroundColor: col.bg, borderColor: col.border }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { borderColor: col.text }]}>
          <Text style={[styles.statusText, { color: col.text }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.agoText}>{fmtAgo(item.created_at)}</Text>
      </View>

      {/* Employee + type */}
      <Text style={styles.employeeName}>{item.employee_name ?? `Employee #${item.employee_id}`}</Text>
      <Text style={styles.leaveType}>{typeLabel}</Text>

      {/* Dates */}
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>📅 </Text>
        <Text style={styles.dateText}>
          {fmtDate(item.start_date)} – {fmtDate(item.end_date)}
          {'  '}
          <Text style={styles.daysText}>{item.total_days} day{item.total_days !== 1 ? 's' : ''}</Text>
        </Text>
      </View>

      {/* Reason */}
      {item.reason ? (
        <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
      ) : null}

      {/* Rejection reason */}
      {item.rejection_reason ? (
        <Text style={styles.rejectionReason}>Rejected: {item.rejection_reason}</Text>
      ) : null}

      {/* Action buttons — pending only */}
      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => onApprove(item.leave_id)}
            activeOpacity={0.8}
          >
            <Text style={styles.approveBtnText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(item.leave_id, item.employee_name ?? 'this employee')}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectBtnText}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function LeaveApprovalScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = filterStatus === 'pending' ? { status: 'pending', limit: 100 } : { limit: 100 };
      const res = await leaveApi.getRequests(params);
      const data = res.data?.requests ?? res.data ?? [];
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = (id: number) => {
    Alert.alert('Approve Leave', 'Approve this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await leaveApi.approve(id);
            setRequests((prev) =>
              prev.map((r) => r.leave_id === id ? { ...r, status: 'approved' } : r),
            );
          } catch {
            Alert.alert('Error', 'Failed to approve leave request.');
          }
        },
      },
    ]);
  };

  const handleRejectOpen = (id: number, name: string) => {
    setRejectReason('');
    setRejectModal({ id, name });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setSubmitting(true);
    try {
      await leaveApi.reject(rejectModal.id, rejectReason || undefined);
      setRequests((prev) =>
        prev.map((r) =>
          r.leave_id === rejectModal.id
            ? { ...r, status: 'rejected', rejection_reason: rejectReason || null }
            : r,
        ),
      );
      setRejectModal(null);
    } catch {
      Alert.alert('Error', 'Failed to reject leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Leave Requests</Text>
          <Text style={styles.subtitle}>
            {pendingCount > 0 ? `${pendingCount} pending approval` : 'All up to date'}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {(['pending', 'all'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filterStatus === tab && styles.tabActive]}
            onPress={() => { setFilterStatus(tab); setLoading(true); }}
          >
            <Text style={[styles.tabText, filterStatus === tab && styles.tabTextActive]}>
              {tab === 'pending' ? 'Pending' : 'All Requests'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.leave_id.toString()}
          renderItem={({ item }) => (
            <LeaveCard
              item={item}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌴</Text>
              <Text style={styles.emptyTitle}>
                {filterStatus === 'pending' ? 'No pending requests' : 'No leave requests'}
              </Text>
              <Text style={styles.emptyText}>
                {filterStatus === 'pending'
                  ? 'All leave requests have been processed.'
                  : 'Guards have not submitted any leave requests yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Reject reason modal */}
      <Modal
        visible={rejectModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Leave Request</Text>
            <Text style={styles.modalSubtitle}>
              Rejecting leave for {rejectModal?.name}
            </Text>
            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter rejection reason…"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, submitting && { opacity: 0.6 }]}
                onPress={handleRejectConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: '#a78bfa', fontSize: 24, lineHeight: 28 },
  headerText: { flex: 1 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 1 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabActive: {
    backgroundColor: '#4c1d95',
    borderColor: '#7c3aed',
  },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#a78bfa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 60 },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  agoText: { color: '#475569', fontSize: 11 },
  employeeName: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  leaveType: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  dateLabel: { fontSize: 13 },
  dateText: { color: '#e2e8f0', fontSize: 13, flex: 1 },
  daysText: { color: '#a78bfa', fontWeight: '700' },
  reason: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  rejectionReason: { color: '#f87171', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: {
    flex: 1,
    backgroundColor: '#14532d',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  approveBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#450a0a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  rejectBtnText: { color: '#f87171', fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  // Reject modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 20 },
  modalLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  reasonInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, backgroundColor: '#0f172a', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  modalCancelText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
  modalRejectBtn: {
    flex: 1, backgroundColor: '#7f1d1d', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#ef4444',
  },
  modalRejectText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
});
