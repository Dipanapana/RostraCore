import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { payrollApi } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Earnings {
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
}

interface PayslipEmployee {
  employee_id: number;
  name: string;
  psira_number: string | null;
  bank_name: string | null;
  account_masked: string | null;
}

interface PayslipRecord {
  payroll_id: number;
  period_start: string;
  period_end: string;
  total_hours: number;
  overtime_hours: number;
  gross_pay: number;
  net_pay: number;
}

interface PayslipData {
  period: { year: number; month: number };
  employee: PayslipEmployee;
  earnings: Earnings;
  records: PayslipRecord[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayslipScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayslip = useCallback(async () => {
    setError(null);
    try {
      const res = await payrollApi.getMyPayslip({ year, month });
      setData(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to load payslip';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    fetchPayslip();
  }, [fetchPayslip]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayslip();
  };

  // Month navigation
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  };
  const nextMonth = () => {
    const isFuture = year > now.getFullYear() ||
      (year === now.getFullYear() && month >= now.getMonth() + 1);
    if (isFuture) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  };
  const isCurrentOrFuture = year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Payslip</Text>
        <Text style={styles.headerSub}>Monthly earnings summary</Text>
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          style={[styles.navBtn, isCurrentOrFuture && styles.navBtnDisabled]}
          disabled={isCurrentOrFuture}
        >
          <Text style={[styles.navArrow, isCurrentOrFuture && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#a78bfa" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorEmoji}>💼</Text>
              <Text style={styles.errorTitle}>No payslip data</Text>
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : data ? (
            <>
              {/* Employee card */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Guard</Text>
                <Text style={styles.empName}>{data.employee.name}</Text>
                {data.employee.psira_number && (
                  <Text style={styles.empDetail}>PSIRA: {data.employee.psira_number}</Text>
                )}
                {data.employee.bank_name && (
                  <Text style={styles.empDetail}>
                    {data.employee.bank_name} {data.employee.account_masked}
                  </Text>
                )}
              </View>

              {/* Net pay hero */}
              <View style={styles.netCard}>
                <Text style={styles.netLabel}>Net Pay</Text>
                <Text style={styles.netAmount}>{fmt(data.earnings.net_pay)}</Text>
                <Text style={styles.netPeriod}>
                  {MONTH_NAMES[month]} {year}
                </Text>
              </View>

              {/* Earnings breakdown */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Earnings</Text>
                <Row label="Gross Pay" value={fmt(data.earnings.gross_pay)} color="#4ade80" />
                <Row label="Deductions" value={`- ${fmt(data.earnings.deductions)}`} color="#f87171" />
                <View style={styles.divider} />
                <Row label="Net Pay" value={fmt(data.earnings.net_pay)} color="#a78bfa" bold />
              </View>

              {/* Hours breakdown */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Hours</Text>
                <Row label="Regular Hours" value={`${data.earnings.regular_hours}h`} />
                <Row label="Overtime Hours" value={`${data.earnings.overtime_hours}h`} color="#fbbf24" />
                <View style={styles.divider} />
                <Row label="Total Hours" value={`${data.earnings.total_hours}h`} bold />
              </View>

              {/* Per-record list (if multiple runs in period) */}
              {data.records.length > 1 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Payroll Runs ({data.records.length})</Text>
                  {data.records.map(r => (
                    <View key={r.payroll_id} style={styles.recordRow}>
                      <Text style={styles.recordDate}>
                        {r.period_start} – {r.period_end}
                      </Text>
                      <Text style={styles.recordNet}>{fmt(r.net_pay)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {data.records.length === 0 && (
                <View style={styles.emptyRuns}>
                  <Text style={styles.emptyRunsText}>
                    No payroll runs processed yet for this period.
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function Row({
  label, value, color, bold,
}: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.bold]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
  },
  value: {
    color: '#f1f5f9',
    fontSize: 14,
  },
  bold: {
    fontWeight: '700',
    color: '#f1f5f9',
    fontSize: 15,
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 40,
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontSize: 28,
    color: '#a78bfa',
    lineHeight: 32,
  },
  navArrowDisabled: {
    color: '#475569',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  empName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  empDetail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  netCard: {
    backgroundColor: '#4c1d95',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c4b5fd',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  netAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f5f3ff',
    letterSpacing: -1,
  },
  netPeriod: {
    fontSize: 13,
    color: '#a78bfa',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  recordDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  recordNet: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ade80',
  },
  emptyRuns: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyRunsText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
