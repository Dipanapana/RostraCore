import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { messagingApi } from '../services/api';
import { ChatChannel, ChatMessage } from '../types';
import { useAuthStore } from '../context/authStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function getChannelTypeBadge(type: string): { label: string; color: string; bg: string } {
  switch (type) {
    case 'direct':
      return { label: 'DM', color: '#93c5fd', bg: '#1e3a5f' };
    case 'group':
      return { label: 'Group', color: '#a78bfa', bg: '#4c1d95' };
    case 'site':
      return { label: 'Site', color: '#6ee7b7', bg: '#064e3b' };
    case 'broadcast':
      return { label: 'Broadcast', color: '#fbbf24', bg: '#78350f' };
    default:
      return { label: type, color: '#94a3b8', bg: '#334155' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessagingScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;

  // -- View state --
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);

  // -- Channel list state --
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsRefreshing, setChannelsRefreshing] = useState(false);

  // -- Chat view state --
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // =========================================================================
  // Channel List
  // =========================================================================

  const loadChannels = useCallback(async () => {
    try {
      const res = await messagingApi.getChannels();
      const data = res.data?.channels || res.data || [];
      setChannels(data);
    } catch {
      // Silently fail
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const onRefreshChannels = async () => {
    setChannelsRefreshing(true);
    await loadChannels();
    setChannelsRefreshing(false);
  };

  const openChannel = (channel: ChatChannel) => {
    setActiveChannel(channel);
    setMessages([]);
    setMessageText('');
  };

  const closeChannel = () => {
    setActiveChannel(null);
    setMessages([]);
    setMessageText('');
    // Refresh channels to update unread counts
    loadChannels();
  };

  // =========================================================================
  // Chat Messages
  // =========================================================================

  const loadMessages = useCallback(async (channelId: number) => {
    try {
      const res = await messagingApi.getMessages(channelId, { limit: 50 });
      const data = res.data?.messages || res.data || [];
      setMessages(data);
    } catch {
      // Silently fail
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Load messages when channel opens
  useEffect(() => {
    if (!activeChannel) return;
    setMessagesLoading(true);
    loadMessages(activeChannel.channel_id);
  }, [activeChannel, loadMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!activeChannel) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      loadMessages(activeChannel.channel_id);
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeChannel, loadMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeChannel || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic insert
    const optimisticMessage: ChatMessage = {
      message_id: Date.now(),
      channel_id: activeChannel.channel_id,
      sender_id: currentUserId || 0,
      sender_name: user?.full_name || 'You',
      content,
      message_type: 'text',
      sent_at: new Date().toISOString(),
    };
    setMessages((prev) => [optimisticMessage, ...prev]);

    try {
      await messagingApi.sendMessage(activeChannel.channel_id, content);
      // Reload to get server-confirmed message
      await loadMessages(activeChannel.channel_id);
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((m) => m.message_id !== optimisticMessage.message_id),
      );
      setMessageText(content); // Restore the text so user can retry
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // Render: Channel List
  // =========================================================================

  const renderChannelItem = ({ item }: { item: ChatChannel }) => {
    const badge = getChannelTypeBadge(item.channel_type);
    const hasUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.channelCard, hasUnread && styles.channelUnread]}
        onPress={() => openChannel(item)}
        activeOpacity={0.7}
      >
        <View style={styles.channelRow}>
          <View style={styles.channelInfo}>
            <View style={styles.channelNameRow}>
              <Text
                style={[styles.channelName, hasUnread && styles.channelNameBold]}
                numberOfLines={1}
              >
                {item.name || 'Direct Message'}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.typeBadgeText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            </View>
            {item.last_message ? (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.last_message}
              </Text>
            ) : (
              <Text style={styles.lastMessageEmpty}>No messages yet</Text>
            )}
          </View>
          <View style={styles.channelMeta}>
            {item.created_at && (
              <Text style={styles.channelTime}>
                {formatTime(item.created_at)}
              </Text>
            )}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count! > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChannelList = () => {
    if (channelsLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.channel_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={channelsRefreshing}
              onRefresh={onRefreshChannels}
              tintColor="#7c3aed"
              colors={['#7c3aed']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Channels will appear here when you are added to a group or receive a message.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  };

  // =========================================================================
  // Render: Chat View
  // =========================================================================

  const isOwnMessage = (msg: ChatMessage) => msg.sender_id === currentUserId;
  const isGroupChat =
    activeChannel?.channel_type === 'group' ||
    activeChannel?.channel_type === 'site' ||
    activeChannel?.channel_type === 'broadcast';

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const own = isOwnMessage(item);

    return (
      <View
        style={[
          styles.messageBubbleWrapper,
          own ? styles.messageBubbleRight : styles.messageBubbleLeft,
        ]}
      >
        {!own && isGroupChat && (
          <Text style={styles.senderName}>
            {item.sender_name || `User ${item.sender_id}`}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            own ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text style={[styles.messageText, own && styles.ownMessageText]}>
            {item.content}
          </Text>
        </View>
        <Text
          style={[
            styles.messageTime,
            own ? styles.messageTimeRight : styles.messageTimeLeft,
          ]}
        >
          {formatMessageTime(item.sent_at)}
        </Text>
      </View>
    );
  };

  const renderChatView = () => {
    if (!activeChannel) return null;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={closeChannel}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>
              {activeChannel.name || 'Direct Message'}
            </Text>
            {isGroupChat && (
              <Text style={styles.chatHeaderSubtitle}>
                {activeChannel.channel_type === 'site'
                  ? 'Site channel'
                  : activeChannel.channel_type === 'broadcast'
                    ? 'Broadcast'
                    : 'Group chat'}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Messages */}
          {messagesLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.message_id.toString()}
              contentContainerStyle={styles.messagesContent}
              inverted
              ListEmptyComponent={
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesText}>
                    No messages yet. Start the conversation!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#64748b"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  // =========================================================================
  // Main Render
  // =========================================================================

  if (activeChannel) {
    return renderChatView();
  }

  return renderChannelList();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // -- Layout --
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // -- Header (shared) --
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 4,
  },
  chatHeaderTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  chatHeaderSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginLeft: 4,
  },
  headerSpacer: {
    width: 36,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
  },

  // -- Channel List --
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  channelCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelUnread: {
    borderColor: '#7c3aed',
    backgroundColor: '#1a1535',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
    marginRight: 12,
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  channelName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  channelNameBold: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastMessage: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  lastMessageEmpty: {
    color: '#475569',
    fontSize: 13,
    fontStyle: 'italic',
  },
  channelMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  channelTime: {
    color: '#475569',
    fontSize: 11,
  },
  unreadBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // -- Empty States --
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    // Because FlatList is inverted, this appears at the "top" visually
    transform: [{ scaleY: -1 }],
  },
  emptyMessagesText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },

  // -- Chat Body --
  chatBody: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // -- Message Bubbles --
  messageBubbleWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageBubbleLeft: {
    alignSelf: 'flex-start',
  },
  messageBubbleRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 21,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    color: '#475569',
    fontSize: 10,
    marginTop: 3,
  },
  messageTimeLeft: {
    marginLeft: 4,
  },
  messageTimeRight: {
    textAlign: 'right',
    marginRight: 4,
  },

  // -- Input Bar --
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#f8fafc',
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#4c1d95',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
