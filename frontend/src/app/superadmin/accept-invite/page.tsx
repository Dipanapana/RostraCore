'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { superadminApi } from '@/services/api'
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<{
    email: string
    full_name: string | null
  } | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Password validation
  const passwordMinLength = password.length >= 8
  const passwordHasUpper = /[A-Z]/.test(password)
  const passwordHasLower = /[a-z]/.test(password)
  const passwordHasNumber = /[0-9]/.test(password)
  const passwordHasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const passwordValid =
    passwordMinLength && passwordHasUpper && passwordHasLower && passwordHasNumber && passwordHasSpecial
  const passwordsMatch = password === confirmPassword && password.length > 0

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setValidating(false)
      setLoading(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      setValidating(true)
      const res = await superadminApi.validateInvitation(token!)
      setInvitationData({
        email: res.data.email,
        full_name: res.data.full_name,
      })
      setFullName(res.data.full_name || '')
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('This invitation link is invalid or has been revoked.')
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || 'This invitation has expired.')
      } else {
        setError('Failed to validate invitation. Please try again.')
      }
    } finally {
      setValidating(false)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordValid) {
      setSubmitError('Please meet all password requirements')
      return
    }

    if (!passwordsMatch) {
      setSubmitError('Passwords do not match')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await superadminApi.acceptInvitation({
        token: token!,
        password,
        full_name: fullName || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to accept invitation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Created!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your SuperAdmin account has been created successfully. You can now log in with your email and password.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b dark:border-slate-700">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to RostraCore</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You've been invited to join as a SuperAdmin
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* Email (read-only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={invitationData?.email || ''}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-700 dark:border-slate-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a strong password"
                className="w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className={passwordMinLength ? 'text-green-600' : 'text-gray-400'}>
                {passwordMinLength ? '✓' : '○'} 8+ characters
              </span>
              <span className={passwordHasUpper ? 'text-green-600' : 'text-gray-400'}>
                {passwordHasUpper ? '✓' : '○'} Uppercase letter
              </span>
              <span className={passwordHasLower ? 'text-green-600' : 'text-gray-400'}>
                {passwordHasLower ? '✓' : '○'} Lowercase letter
              </span>
              <span className={passwordHasNumber ? 'text-green-600' : 'text-gray-400'}>
                {passwordHasNumber ? '✓' : '○'} Number
              </span>
              <span className={passwordHasSpecial ? 'text-green-600' : 'text-gray-400'}>
                {passwordHasSpecial ? '✓' : '○'} Special character
              </span>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
                className={`w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                  confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !passwordValid || !passwordsMatch}
            className="w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Create SuperAdmin Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
