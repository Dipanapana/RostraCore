import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardApi } from '../services/api';
import { useAuthStore } from '../context/authStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  total_employees: number;
  active_employees: number;
  total_clients: number;
  total_sites: number;
  shifts_today: number;
  shifts_filled: number;
  shifts_unfilled: number;
  fill_rate: number;
  revenue_this_month: number;
  costs_this_month: number;
  profit_margin: number;
  pending_leave_requests: number;
  expiring_certifications: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboardScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
      >
        <Text style={styles.greeting}>
          {user?.organization_name || 'Dashboard'}
        </Text>
        <Text style={styles.title}>Operations Overview</Text>

        {/* Workforce */}
        <Text style={styles.sectionTitle}>Workforce</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Active Guards"
            value={stats?.active_employees ?? 0}
            subtitle={`of ${stats?.total_employees ?? 0} total`}
            color="#3b82f6"
          />
          <StatCard
            title="Clients"
            value={stats?.total_clients ?? 0}
            subtitle={`${stats?.total_sites ?? 0} sites`}
            color="#8b5cf6"
          />
        </View>

        {/* Operations */}
        <Text style={styles.sectionTitle}>Today's Operations</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Shifts Today"
            value={stats?.shifts_today ?? 0}
            subtitle={`${stats?.shifts_filled ?? 0} filled`}
            color="#10b981"
          />
          <StatCard
            title="Fill Rate"
            value={`${(stats?.fill_rate ?? 0).toFixed(0)}%`}
            subtitle={`${stats?.shifts_unfilled ?? 0} unfilled`}
            color={
              (stats?.fill_rate ?? 0) >= 90
                ? '#10b981'
                : (stats?.fill_rate ?? 0) >= 75
                ? '#f59e0b'
                : '#ef4444'
            }
          />
        </View>

        {/* Financial */}
        <Text style={styles.sectionTitle}>Financial (This Month)</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Revenue"
            value={formatCurrency(stats?.revenue_this_month ?? 0)}
            color="#10b981"
          />
          <StatCard
            title="Costs"
            value={formatCurrency(stats?.costs_this_month ?? 0)}
            color="#ef4444"
          />
        </View>
        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>Profit Margin</Text>
          <Text
            style={[
              styles.profitValue,
              {
                color:
                  (stats?.profit_margin ?? 0) >= 20 ? '#4ade80' : '#fbbf24',
              },
            ]}
          >
            {(stats?.profit_margin ?? 0).toFixed(1)}%
          </Text>
        </View>

        {/* Alerts */}
        <Text style={styles.sectionTitle}>Action Required</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Leave"
            value={stats?.pending_leave_requests ?? 0}
            subtitle="requests"
            color="#f59e0b"
          />
          <StatCard
            title="Expiring Certs"
            value={stats?.expiring_certifications ?? 0}
            subtitle="next 30 days"
            color="#ef4444"
          />
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  greeting: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 3,
  },
  statTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  profitCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  profitValue: {
    fontSize: 28,
    fontWeight: '800',
  },
});
