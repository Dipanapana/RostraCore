"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Mail, Phone, Lock, Building2, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, Check, X, RefreshCw } from "lucide-react";
import { getApiUrl } from "@/lib/config";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    company_name: "", // For creating organization
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: "Contains a number", met: /[0-9]/.test(formData.password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(formData.password) },
  ];

  const passwordsMatch = formData.password.length > 0 && formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      // Register user
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            phone: formData.phone || null,
            company_name: formData.company_name,
            role: "admin", // First user is admin
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      setRegisteredEmail(formData.email);
      setSuccess(
        "Registration successful! Please check your email to verify your account."
      );

      // Redirect to login after 5 seconds
      setTimeout(() => {
        router.push("/login");
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess("");
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      if (response.ok) {
        setResendSuccess("Verification email resent! Check your inbox.");
      }
    } catch {
      // Silent
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 py-12 px-4">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow delay-300" />
      </div>

      <div className="w-full max-w-2xl mx-auto relative z-10">
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
            Start Your 14-Day Free Trial
          </h1>
          <p className="text-sm text-gray-500">
            No credit card required &bull; Cancel anytime
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl animate-slide-up delay-100 border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </div>
          )}

          {/* Email Verification Prompt */}
          {success && (
            <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  We&apos;ve sent a verification email to{" "}
                  <span className="font-bold text-blue-600">{registeredEmail}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Didn&apos;t receive it? Check your spam folder or click below to resend.
                </p>
              </div>

              {resendSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {resendSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend Verification Email
                  </>
                )}
              </button>

              <div>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two-column layout for larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                    placeholder="Choose a username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Full Name Field */}
              <div className="space-y-2">
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Phone Field (Optional) */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone (Optional)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                    placeholder="+27 12 345 6789"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                    placeholder="Min 8 characters"
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

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors ${passwordsMatch ? "text-emerald-500" : "text-gray-500 group-focus-within:text-blue-400"}`} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`block w-full pl-11 pr-12 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400 ${passwordsMatch ? "border-emerald-300" : "border-gray-300"}`}
                    placeholder="Re-enter password"
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
                {formData.confirmPassword.length > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                    {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>
            </div>

            {/* Password Strength Requirements */}
            {formData.password.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {passwordRequirements.map((req) => (
                  <div key={req.label} className={`flex items-center gap-1.5 text-xs ${req.met ? "text-emerald-600" : "text-gray-400"}`}>
                    {req.met ? <Check className="w-3 h-3 flex-shrink-0" /> : <X className="w-3 h-3 flex-shrink-0" />}
                    {req.label}
                  </div>
                ))}
              </div>
            )}

            {/* Company Name Field (Full Width) */}
            <div className="space-y-2">
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Company Name *
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                  placeholder="Your Company Name"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                This will be displayed on your dashboard and PDF reports
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                disabled={loading}
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I agree to the{" "}
                <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Redirecting to login...
                </>
              ) : (
                <>
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home Link */}
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
