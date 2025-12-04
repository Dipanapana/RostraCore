"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  user_id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserInfo();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      console.log("[AUTH] Fetching user info from API...");
      const response = await api.get("/api/v1/auth/me");
      console.log("[AUTH] User info received:", response.data);
      setUser(response.data);
    } catch (error) {
      console.error("[AUTH] Not authenticated or session expired");
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log("[AUTH] 1. Starting login process...");
      console.log("[AUTH] API_URL:", API_URL);

      // Use URLSearchParams for OAuth2 password flow
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post("/api/v1/auth/login", params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log("[AUTH] 2. Login successful");
      console.log("[AUTH] Response:", response.data);

      // Store token in localStorage and state
      if (response.data.access_token) {
        console.log('[AUTH] Storing token:', response.data.access_token.substring(0, 30) + '...');
        localStorage.setItem('access_token', response.data.access_token);
        setToken(response.data.access_token);
        // Verify it was stored
        const storedToken = localStorage.getItem('access_token');
        console.log('[AUTH] Token verified in localStorage:', storedToken ? 'YES' : 'NO');
      } else {
        console.error('[AUTH] No access_token in response!', response.data);
      }

      // Set user from response and determine redirect
      let userRole: string | undefined;
      if (response.data.user) {
        setUser(response.data.user);
        userRole = response.data.user.role;
      } else {
        // Fetch user info if not in response
        const userResponse = await api.get("/api/v1/auth/me");
        setUser(userResponse.data);
        userRole = userResponse.data.role;
      }

      // Redirect based on user role (use window.location for full page reload to reinitialize with token)
      const redirectUrl = userRole?.toLowerCase() === 'superadmin' ? '/superadmin' : '/dashboard';
      console.log(`[AUTH] 3. Redirecting to ${redirectUrl} (role: ${userRole})...`);
      window.location.href = redirectUrl;
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(
        error.response?.data?.detail || "Invalid username or password"
      );
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await api.post("/api/v1/auth/logout");
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear token and user state
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
