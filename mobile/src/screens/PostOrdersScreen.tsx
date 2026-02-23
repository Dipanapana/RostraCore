import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { postOrdersApi } from '../services/api';
import { PostOrder } from '../types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PostOrdersScreen() {
  const navigation = useNavigation();

  const [postOrders, setPostOrders] = useState<PostOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadPostOrders = useCallback(async () => {
    try {
      const res = await postOrdersApi.getAll({ status: 'active' });
      setPostOrders(res.data?.post_orders || res.data || []);
    } catch {
      // Silently fail — user can pull-to-refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPostOrders();
  }, [loadPostOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPostOrders();
    setRefreshing(false);
  };

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAcknowledge = async (id: number) => {
    setAcknowledgingId(id);
    try {
      await postOrdersApi.acknowledge(id);
      setPostOrders((prev) =>
        prev.map((po) =>
          po.post_order_id === id ? { ...po, acknowledged: true } : po,
        ),
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to acknowledge. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setAcknowledgingId(null);
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderItem = ({ item }: { item: PostOrder }) => {
    const isExpanded = expandedId === item.post_order_id;
    const isAcknowledged = item.acknowledged === true;
    const needsAck = item.requires_acknowledgment && !isAcknowledged;
    const isAcknowledging = acknowledgingId === item.post_order_id;

    return (
      <TouchableOpacity
        style={[styles.card, needsAck && styles.cardNeedsAck]}
        onPress={() => toggleExpand(item.post_order_id)}
        activeOpacity={0.7}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 2}>
              {item.title}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{item.version}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            {item.site_name && (
              <Text style={styles.siteName}>{item.site_name}</Text>
            )}

            {/* Status indicator */}
            {item.requires_acknowledgment && (
              <View style={styles.statusRow}>
                {isAcknowledged ? (
                  <View style={styles.statusAcknowledged}>
                    <Text style={styles.statusIcon}>{'✓'}</Text>
                    <Text style={styles.statusTextGreen}>Acknowledged</Text>
                  </View>
                ) : (
                  <View style={styles.statusPending}>
                    <Text style={styles.statusIcon}>{'!'}</Text>
                    <Text style={styles.statusTextAmber}>Needs Acknowledgment</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Expand indicator */}
          <Text style={styles.expandIndicator}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </View>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.contentDivider} />
            <Text style={styles.contentText}>{item.content}</Text>

            {/* Acknowledge button for unacknowledged orders */}
            {needsAck && (
              <TouchableOpacity
                style={[
                  styles.acknowledgeButton,
                  isAcknowledging && styles.acknowledgeButtonDisabled,
                ]}
                onPress={() => handleAcknowledge(item.post_order_id)}
                disabled={isAcknowledging}
                activeOpacity={0.8}
              >
                {isAcknowledging ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.acknowledgeButtonText}>
                    Acknowledge Post Order
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Show acknowledged badge in expanded view too */}
            {isAcknowledged && item.requires_acknowledgment && (
              <View style={styles.acknowledgedBadge}>
                <Text style={styles.acknowledgedBadgeIcon}>{'✓'}</Text>
                <Text style={styles.acknowledgedBadgeText}>
                  You have acknowledged this post order
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Orders</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Post Orders List */}
      <FlatList
        data={postOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item.post_order_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'📋'}</Text>
            <Text style={styles.emptyTitle}>No Post Orders</Text>
            <Text style={styles.emptySubtitle}>
              There are no active post orders for your assigned sites.
            </Text>
          </View>
        }
      />
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 22,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardNeedsAck: {
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  cardHeader: {
    position: 'relative',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 24,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  versionBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardMeta: {
    marginBottom: 4,
  },
  siteName: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusAcknowledged: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  statusTextGreen: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextAmber: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  expandIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    color: '#475569',
    fontSize: 12,
  },

  // Expanded content
  expandedSection: {
    marginTop: 4,
  },
  contentDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  contentText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },

  // Acknowledge button
  acknowledgeButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acknowledgeButtonDisabled: {
    opacity: 0.6,
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Acknowledged badge (in expanded view)
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  acknowledgedBadgeIcon: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  acknowledgedBadgeText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
