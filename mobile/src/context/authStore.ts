import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/api';
import { User } from '../types';

// ---------------------------------------------------------------------------
// Auth Store (Zustand)
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start true — we check stored token on app launch
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      const { access_token, refresh_token } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync('access_token', access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      // Fetch user profile
      const meResponse = await authApi.me();
      const user = meResponse.data;

      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || 'Login failed. Check your credentials.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const meResponse = await authApi.me();
      set({
        user: meResponse.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
