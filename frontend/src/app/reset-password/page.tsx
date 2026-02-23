"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getApiUrl } from "@/lib/config";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token,
            new_password: password,
          }),
        }
      );

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to reset password. The link may have expired.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const authShell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow delay-300" />
      </div>
      <div className="w-full max-w-md px-4 relative z-10">{children}</div>
    </div>
  );

  // No token
  if (!token) {
    return authShell(
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 text-center animate-slide-up">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
        <p className="text-sm text-gray-500 mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-center"
        >
          Request New Reset Link
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center mt-4 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Back to login
        </Link>
      </div>
    );
  }

  // Success
  if (success) {
    return authShell(
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 text-center animate-slide-up">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Password Reset Successful</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your password has been successfully reset. You can now log in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-center"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Form
  return authShell(
    <>
      {/* Logo & Header */}
      <div className="text-center mb-8 animate-slide-up">
        <Link href="/" className="inline-flex justify-center mb-8 hover:scale-105 transition-transform duration-300">
          <Image
            src="/rostracore-logo.svg"
            alt="RostraCore"
            width={240}
            height={70}
            className="w-64 h-auto drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            priority
          />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Reset Your Password
        </h1>
        <p className="text-sm text-gray-500">
          Enter your new password below
        </p>
      </div>

      {/* Card */}
      <div className="bg-white p-8 rounded-2xl shadow-2xl animate-slide-up delay-100 border border-gray-200">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                placeholder="Enter new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {password.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? "text-emerald-600" : "text-gray-400"}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  8+ characters
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? "text-emerald-600" : "text-gray-400"}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  Uppercase letter
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.hasLowercase ? "text-emerald-600" : "text-gray-400"}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  Lowercase letter
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.hasNumber ? "text-emerald-600" : "text-gray-400"}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  One number
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full pl-11 pr-12 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400 ${
                  confirmPassword && !passwordsMatch
                    ? "border-red-300"
                    : confirmPassword && passwordsMatch
                    ? "border-emerald-300"
                    : "border-gray-300"
                }`}
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="text-xs text-emerald-600">Passwords match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isPasswordValid || !passwordsMatch}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                Reset Password
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Remember your password?{' '}
            <Link href="/login" className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8 text-center animate-slide-up delay-200">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-2 group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
