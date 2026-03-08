"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { messagingApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Hash,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
  channel_id: number;
  name: string | null;
  channel_type: string;
  site_id: number | null;
  site_name: string | null;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

interface Message {
  message_id: number;
  channel_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  message_type: string;
  sent_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Create Channel Modal
// ---------------------------------------------------------------------------

function CreateChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState("group");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await messagingApi.createChannel({ name, channel_type: channelType });
      onCreated();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Channel</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Site Alpha Team"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Type</label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="group">Group</option>
              <option value="site">Site Channel</option>
              <option value="broadcast">Broadcast</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MessagingPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await messagingApi.getChannels();
      setChannels(res.data || []);
    } catch {
      setChannels([]);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId: number) => {
    setMsgLoading(true);
    try {
      const res = await messagingApi.getMessages(channelId, { limit: 100 });
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels().finally(() => setLoading(false));
  }, [fetchChannels]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.channel_id);
      const interval = setInterval(() => fetchMessages(selectedChannel.channel_id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChannel, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    setSending(true);
    try {
      await messagingApi.sendMessage(selectedChannel.channel_id, { content: newMessage });
      setNewMessage("");
      await fetchMessages(selectedChannel.channel_id);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Messaging"
        subtitle="Team communication channels"
        icon={<MessageSquare className="text-blue-600" size={28} />}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            New Channel
          </button>
        }
      />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-220px)] rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        {/* Channel List */}
        <div className={`w-full sm:w-80 border-r border-gray-200 bg-gray-50 flex flex-col ${selectedChannel ? "hidden sm:flex" : "flex"}`}>
          <div className="p-3 border-b border-gray-200">
            <p className="text-xs uppercase text-gray-500 font-medium">Channels ({channels.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {channels.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                No channels yet. Create one to get started.
              </div>
            ) : (
              channels.map((ch) => (
                <button
                  key={ch.channel_id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-100 ${
                    selectedChannel?.channel_id === ch.channel_id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {ch.channel_type === "group" ? <Hash size={14} className="text-gray-400 shrink-0" /> : <Users size={14} className="text-gray-400 shrink-0" />}
                      <span className="text-sm font-medium text-gray-900 truncate">{ch.name || "Unnamed"}</span>
                    </div>
                    {ch.unread_count > 0 && (
                      <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">
                        {ch.unread_count}
                      </span>
                    )}
                  </div>
                  {ch.last_message && (
                    <p className="mt-1 text-xs text-gray-400 truncate">{ch.last_message}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{ch.member_count} members</span>
                    {ch.last_message_at && <span className="text-xs text-gray-400">{fmtTime(ch.last_message_at)}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className={`flex-1 flex flex-col bg-white ${!selectedChannel ? "hidden sm:flex" : "flex"}`}>
          {!selectedChannel ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                <p>Select a channel to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Channel Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50">
                <button onClick={() => setSelectedChannel(null)} className="sm:hidden text-gray-400 hover:text-gray-700">
                  <ArrowLeft size={18} />
                </button>
                <Hash size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedChannel.name}</p>
                  <p className="text-xs text-gray-400">{selectedChannel.member_count} members</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading && messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.message_id} className="flex gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-900">{msg.sender_name}</span>
                          <span className="text-xs text-gray-400">{fmtTime(msg.sent_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${selectedChannel.name || "channel"}...`}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchChannels();
          }}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
