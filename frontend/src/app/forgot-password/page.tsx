"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { getApiUrl } from "@/lib/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to send reset email");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow delay-300" />
        </div>
        <div className="w-full max-w-md px-4 relative z-10">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 text-center animate-slide-up">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-6">
              If an account with that email exists, we&apos;ve sent password reset instructions.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow delay-300" />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
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
            Forgot your password?
          </h1>
          <p className="text-sm text-gray-500">
            Enter your email and we&apos;ll send you reset instructions
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-2xl animate-slide-up delay-100 border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link
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
      </div>
    </div>
  );
}
