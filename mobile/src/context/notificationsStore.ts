import { create } from 'zustand';
import { notificationsApi } from '../services/api';

// ---------------------------------------------------------------------------
// Notifications Store (Zustand)
// ---------------------------------------------------------------------------
//
// Drives the unread badge on the Alerts tab in both AppNavigator and
// AdminNavigator. Screens that mark notifications as read call
// decrementUnread or resetUnread to keep the badge in sync without
// a full network round-trip.
// ---------------------------------------------------------------------------

interface NotificationsState {
  unreadCount: number;

  fetchUnreadCount: () => Promise<void>;
  decrementUnread: (by?: number) => void;
  resetUnread: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.getAll({ unread_only: true, limit: 1 });
      set({ unreadCount: res.data.unread_count ?? 0 });
    } catch {
      // Non-fatal — badge stays at last known value
    }
  },

  decrementUnread: (by = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) })),

  resetUnread: () => set({ unreadCount: 0 }),
}));
