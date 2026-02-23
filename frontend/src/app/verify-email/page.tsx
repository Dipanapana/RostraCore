"use client";

// Force dynamic rendering to avoid useSearchParams SSR issues
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getApiUrl } from "@/lib/config";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/auth/verify-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Email verified successfully! You can now log in.");
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.detail || "Email verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResendVerification = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    setResendSuccess("");
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (response.ok) {
        setResendSuccess("Verification email sent! Please check your inbox.");
      }
    } catch {
      // Silent
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full mx-4 relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center mb-6 hover:scale-105 transition-transform duration-300">
            <Image
              src="/rostracore-logo.svg"
              alt="RostraCore"
              width={200}
              height={60}
              className="w-52 h-auto"
              priority
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 text-center">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === "loading" && (
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
            )}
            {status === "error" && (
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          {/* Message */}
          <div className="mb-6">
            {status === "loading" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
                <p className="text-gray-500">Please wait while we verify your email address...</p>
              </>
            )}

            {status === "success" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                <p className="text-emerald-600 font-medium mb-2">{message}</p>
                <p className="text-sm text-gray-400">Redirecting to login page...</p>
              </>
            )}

            {status === "error" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                <p className="text-red-600 mb-4">{message}</p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  Go to Login
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-400">or</span>
                  </div>
                </div>

                {/* Resend Verification */}
                <div>
                  <p className="text-sm text-gray-600 mb-3">Request a new verification link</p>
                  <div className="relative mb-3">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || !resendEmail}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {resendLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Resend Verification Email
                  </button>
                  {resendSuccess && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{resendSuccess}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Back to Home Link */}
          {status !== "loading" && (
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
