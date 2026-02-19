import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { leaveApi } from '../services/api';
import { LeaveRequest } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEAVE_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'annual', label: 'Annual', emoji: '🌴' },
  { value: 'sick', label: 'Sick', emoji: '🤒' },
  { value: 'family_responsibility', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'compassionate', label: 'Compassionate', emoji: '💙' },
  { value: 'unpaid', label: 'Unpaid', emoji: '📋' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: '#422006', text: '#fdba74', label: 'Pending' },
  approved: { bg: '#14532d', text: '#86efac', label: 'Approved' },
  rejected: { bg: '#450a0a', text: '#fca5a5', label: 'Rejected' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

function leaveDays(start: string, end: string): number {
  try {
    return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  } catch {
    return 0;
  }
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LeaveCard({ item }: { item: LeaveRequest }) {
  const s = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
  const typeLabel =
    LEAVE_TYPES.find((t) => t.value === item.leave_type)?.label ??
    item.leave_type;
  const days = leaveDays(item.start_date, item.end_date);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardType}>{typeLabel} Leave</Text>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
        </View>
      </View>
      <Text style={styles.cardDates}>
        {formatDate(item.start_date)} → {formatDate(item.end_date)}
        {'  '}
        <Text style={styles.cardDays}>({days} day{days !== 1 ? 's' : ''})</Text>
      </Text>
      {item.reason ? (
        <Text style={styles.cardReason} numberOfLines={2}>{item.reason}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type View = 'list' | 'new';

export default function LeaveScreen() {
  const navigation = useNavigation();
  const [view, setView] = useState<View>('list');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await leaveApi.getMyLeave();
      setRequests(res.data ?? []);
    } catch {
      // stay empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function resetForm() {
    setLeaveType('annual');
    setStartDate('');
    setEndDate('');
    setReason('');
  }

  async function handleSubmit() {
    if (!isValidDate(startDate)) {
      Alert.alert('Invalid date', 'Enter start date as YYYY-MM-DD.');
      return;
    }
    if (!isValidDate(endDate)) {
      Alert.alert('Invalid date', 'Enter end date as YYYY-MM-DD.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Invalid range', 'End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    try {
      await leaveApi.requestLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });
      resetForm();
      setView('list');
      setLoading(true);
      await fetchRequests();
      Alert.alert('Submitted', 'Your leave request has been sent for approval.');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? 'Could not submit leave request.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------
  // Render: list view
  // ------------------------------------------------------------------

  function renderList() {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setView('new')}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ New Leave Request</Text>
        </TouchableOpacity>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌴</Text>
            <Text style={styles.emptyText}>No leave requests yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to submit one
            </Text>
          </View>
        ) : (
          requests.map((r) => (
            <LeaveCard key={r.id} item={r} />
          ))
        )}
      </ScrollView>
    );
  }

  // ------------------------------------------------------------------
  // Render: new request form
  // ------------------------------------------------------------------

  function renderForm() {
    const today = todayStr();

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Leave type chips */}
          <Text style={styles.label}>Leave Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {LEAVE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeChip,
                  leaveType === t.value && styles.typeChipActive,
                ]}
                onPress={() => setLeaveType(t.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    leaveType === t.value && styles.typeLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Start date */}
          <Text style={styles.label}>Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder={today}
            placeholderTextColor="#475569"
            value={startDate}
            onChangeText={setStartDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
          />
          <Text style={styles.hint}>Format: YYYY-MM-DD</Text>

          {/* End date */}
          <Text style={styles.label}>End Date</Text>
          <TextInput
            style={styles.input}
            placeholder={today}
            placeholderTextColor="#475569"
            value={endDate}
            onChangeText={setEndDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
          />

          {/* Days preview */}
          {isValidDate(startDate) && isValidDate(endDate) && endDate >= startDate && (
            <View style={styles.daysPreview}>
              <Text style={styles.daysPreviewText}>
                📅 {leaveDays(startDate, endDate)} calendar day
                {leaveDays(startDate, endDate) !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Reason */}
          <Text style={styles.label}>Reason <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Enter reason for leave…"
            placeholderTextColor="#475569"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Actions */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              resetForm();
              setView('list');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ------------------------------------------------------------------
  // Root render
  // ------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation as any).goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {view === 'new' ? 'New Request' : 'Leave Requests'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {view === 'list' ? renderList() : renderForm()}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },

  // List view
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  newBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },

  // Leave card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardType: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDates: {
    color: '#94a3b8',
    fontSize: 13,
  },
  cardDays: {
    color: '#64748b',
  },
  cardReason: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Form view
  formContent: {
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  optional: {
    color: '#475569',
    fontWeight: '400',
  },
  hint: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
  typeRow: {
    paddingBottom: 4,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeChipActive: {
    backgroundColor: '#4c1d95',
    borderColor: '#7c3aed',
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  typeLabelActive: {
    color: '#c4b5fd',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    height: 90,
    paddingTop: 12,
  },
  daysPreview: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4c1d95',
    alignItems: 'center',
  },
  daysPreviewText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});
