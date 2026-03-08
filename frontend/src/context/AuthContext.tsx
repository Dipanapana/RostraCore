"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  // Access control fields
  org_id?: number;
  is_owner?: boolean;
  is_superadmin?: boolean;
  managed_client_ids?: number[] | null;  // null = full access, [] = no access, [1,2] = specific clients
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  isLoading: true,
});

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
      const response = await api.get("/api/v1/auth/me");
      setUser(response.data);
    } catch {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post("/api/v1/auth/login", params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Store token in localStorage, state, AND as a cookie for Next.js middleware
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        setToken(response.data.access_token);
        document.cookie = `access_token=${response.data.access_token}; path=/; max-age=${30 * 60}; samesite=lax`;
      }

      // Set user from response and determine redirect
      let userRole: string | undefined;
      if (response.data.user) {
        setUser(response.data.user);
        userRole = response.data.user.role;
      } else {
        const userResponse = await api.get("/api/v1/auth/me");
        setUser(userResponse.data);
        userRole = userResponse.data.role;
      }

      // Redirect based on role (full page reload to reinitialize with token)
      const redirectUrl = userRole?.toLowerCase() === 'superadmin' ? '/superadmin' : '/dashboard';
      window.location.href = redirectUrl;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || "Invalid username or password"
      );
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // Non-fatal — clear local state regardless
    } finally {
      // Clear token and user state
      localStorage.removeItem('access_token');
      document.cookie = 'access_token=; path=/; max-age=0'; // Clear middleware cookie
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
  return useContext(AuthContext);
}
