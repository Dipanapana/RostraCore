"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Send,
} from "lucide-react";
import { getApiUrl } from "@/lib/config";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function PhoneVerificationPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "verified">("phone");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  const loadProfile = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.phone) {
          setPhone(data.phone);
          setOriginalPhone(data.phone);
        }
        if (data.is_phone_verified) {
          setStep("verified");
        }
      }
    } catch {
      // Profile load failed - continue with empty form
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError("");
    setLoading(true);
    setDevCode(null);

    try {
      const token = getToken();

      // If phone number changed, update profile first
      if (phone !== originalPhone && phone) {
        const updateRes = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phone }),
        });
        if (!updateRes.ok) {
          const data = await updateRes.json();
          setError(data.detail || "Failed to update phone number");
          setLoading(false);
          return;
        }
        setOriginalPhone(phone);
      }

      // Send verification code
      const res = await fetch(
        `${getApiUrl()}/api/v1/auth/send-phone-verification`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        // Dev mode returns the code
        if (data.code) {
          setDevCode(data.code);
        }
        setStep("code");
        setCooldown(60);
      } else {
        setError(data.detail || "Failed to send verification code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch(
        `${getApiUrl()}/api/v1/auth/verify-phone?code=${code}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setStep("verified");
      } else {
        setError(data.detail || data.message || "Invalid verification code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
      </DashboardLayout>
    );
  }

  // Verified state
  if (step === "verified") {
    return (
      <DashboardLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Phone Verified
          </h2>
          <p className="text-gray-600 mb-2">
            Your phone number has been verified successfully.
          </p>
          {phone && (
            <p className="text-sm text-gray-500 mb-6">{phone}</p>
          )}
          <button
            onClick={() => router.push("/settings")}
            className="inline-flex items-center justify-center w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Settings
          </button>
        </div>
      </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Phone Verification
            </h1>
            <p className="text-gray-600 mt-1">
              {step === "phone"
                ? "Enter your phone number to receive a verification code via SMS."
                : "Enter the 6-digit code sent to your phone."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 mb-6">
              {error}
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0821234567"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  South African mobile number (e.g., 082 123 4567)
                </p>
              </div>

              <button
                onClick={handleSendCode}
                disabled={loading || !phone}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-6">
              {devCode && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                  <p className="font-medium text-amber-800">Development Mode</p>
                  <p className="text-amber-700">
                    Your verification code is: <span className="font-mono font-bold">{devCode}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(val);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Code sent to {phone}. Expires in 10 minutes.
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Verify Phone
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setDevCode(null);
                    setError("");
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Change number
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={cooldown > 0 || loading}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {cooldown > 0
                    ? `Resend code (${cooldown}s)`
                    : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
