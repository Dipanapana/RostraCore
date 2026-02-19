import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { incidentsApi } from '../services/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MyIncident {
  incident_id: number;
  site_name: string | null;
  incident_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  reported_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#94a3b8', bg: '#1e293b' },
  medium:   { label: 'Medium',   color: '#fbbf24', bg: '#1c1400' },
  high:     { label: 'High',     color: '#fb923c', bg: '#1c0a00' },
  critical: { label: 'Critical', color: '#f87171', bg: '#1c0000' },
};

const STATUS: Record<string, { label: string; color: string }> = {
  reported:     { label: 'Reported',     color: '#60a5fa' },
  investigating:{ label: 'Investigating',color: '#fbbf24' },
  resolved:     { label: 'Resolved',     color: '#4ade80' },
  closed:       { label: 'Closed',       color: '#64748b' },
};

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso.split('T')[0];
  }
}

// ---------------------------------------------------------------------------
// Incident card
// ---------------------------------------------------------------------------

function IncidentCard({ item }: { item: MyIncident }) {
  const sev = SEVERITY[item.severity] ?? SEVERITY.low;
  const sts = STATUS[item.status] ?? STATUS.reported;

  return (
    <View style={[styles.card, { backgroundColor: sev.bg, borderColor: sev.color + '40' }]}>
      {/* Top row: severity + status */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { borderColor: sev.color }]}>
          <Text style={[styles.badgeText, { color: sev.color }]}>{sev.label}</Text>
        </View>
        <View style={[styles.badge, { borderColor: sts.color }]}>
          <Text style={[styles.badgeText, { color: sts.color }]}>{sts.label}</Text>
        </View>
        <Text style={styles.timeText}>{fmtAgo(item.reported_at)}</Text>
      </View>

      {/* Type + site */}
      <Text style={styles.typeText}>
        {item.incident_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        {item.site_name ? <Text style={styles.siteText}> · {item.site_name}</Text> : null}
      </Text>

      {/* Description */}
      <Text style={styles.descText} numberOfLines={3}>{item.description}</Text>

      {/* Resolution notes */}
      {item.resolution_notes && (
        <View style={styles.resolutionBox}>
          <Text style={styles.resolutionLabel}>Resolution:</Text>
          <Text style={styles.resolutionText} numberOfLines={2}>
            {item.resolution_notes}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function MyIncidentsScreen() {
  const navigation = useNavigation<any>();
  const [incidents, setIncidents] = useState<MyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await incidentsApi.getMyIncidents();
      setIncidents(res.data ?? []);
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>My Reports</Text>
          <Text style={styles.subtitle}>Your submitted incident reports</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.incident_id.toString()}
          renderItem={({ item }) => <IncidentCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyText}>
                Incidents you file will appear here so you can track their status.
              </Text>
            </View>
          }
          ListHeaderComponent={
            incidents.length > 0 ? (
              <Text style={styles.countText}>
                {incidents.length} report{incidents.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#a78bfa',
    fontSize: 24,
    lineHeight: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 60,
  },
  countText: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeText: {
    color: '#475569',
    fontSize: 11,
    marginLeft: 'auto',
  },
  typeText: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  siteText: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  descText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
  },
  resolutionBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  resolutionLabel: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resolutionText: {
    color: '#86efac',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
