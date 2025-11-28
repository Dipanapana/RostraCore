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
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount by fetching user info
  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      console.log("[AUTH] Fetching user info from API...");
      const response = await api.get("/api/v1/auth/me");
      console.log("[AUTH] User info received:", response.data);
      setUser(response.data);
    } catch (error) {
      console.error("[AUTH] Not authenticated or session expired");
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

      console.log("[AUTH] 2. Login successful, cookie set by server");
      console.log("[AUTH] Response:", response.data);

      // Set user from response
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        // Fetch user info if not in response
        await fetchUserInfo();
      }

      // Redirect to dashboard
      console.log("[AUTH] 3. Redirecting to dashboard...");
      router.push("/dashboard");
      console.log("[AUTH] 4. Push completed");
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(
        error.response?.data?.detail || "Invalid username or password"
      );
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear the httpOnly cookie
      await api.post("/api/v1/auth/logout");
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear user state regardless of API call success
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
