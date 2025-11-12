"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function TestDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("[TEST-DASHBOARD] Component mounted");
    setMounted(true);

    return () => {
      console.log("[TEST-DASHBOARD] Component unmounting");
    };
  }, []);

  console.log("[TEST-DASHBOARD] Rendering - isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "mounted:", mounted);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Not Authenticated</h2>
          <p className="text-gray-600">Please log in first.</p>
          <a href="/login" className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Test Dashboard - No API Calls
          </h1>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                ✅ Authentication Working
              </h2>
              <p className="text-gray-700">You are successfully logged in!</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">User Info:</h3>
              <pre className="bg-white p-3 rounded border border-blue-200 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Component State:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Is Loading: {isLoading ? "Yes" : "No"}</li>
                <li>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</li>
                <li>Component Mounted: {mounted ? "Yes" : "No"}</li>
              </ul>
            </div>

            <div className="flex gap-4 mt-6">
              <a
                href="/dashboard"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Go to Real Dashboard
              </a>
              <a
                href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
