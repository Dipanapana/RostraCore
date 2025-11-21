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
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserInfo(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async (authToken: string) => {
    try {
      console.log("[AUTH] Fetching user info from API...");
      const response = await api.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      console.log("[AUTH] User info received:", response.data);
      setUser(response.data);
    } catch (error) {
      console.error("[AUTH] Failed to fetch user info:", error);
      // Token invalid, clear it
      localStorage.removeItem("token");
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

      console.log("[AUTH] 2. Login successful, received token");
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem("token", access_token);

      // Fetch user info
      console.log("[AUTH] 3. Fetching user info...");
      await fetchUserInfo(access_token);

      // Redirect to dashboard
      console.log("[AUTH] 4. Redirecting to dashboard...");
      router.push("/dashboard");
      console.log("[AUTH] 5. Push completed");
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(
        error.response?.data?.detail || "Invalid username or password"
      );
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
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
