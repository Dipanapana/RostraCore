'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import api from '@/services/api'
import { useToast } from '@/context/ToastContext'

interface CompanyProfile {
  company_name: string
  registration_number: string
  vat_number: string
  psira_company_registration: string
  address_line1: string
  address_line2: string
  city: string
  postal_code: string
  phone: string
  billing_email: string
  logo_url: string
  payslip_template: string
}

const PAYSLIP_TEMPLATES = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean and formal, Sage-inspired',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimal with accent colors',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional payslip layout',
  },
] as const

export default function CompanyProfilePage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: '',
    registration_number: '',
    vat_number: '',
    psira_company_registration: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    phone: '',
    billing_email: '',
    logo_url: '',
    payslip_template: 'professional',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/organizations/current')
      const org = response.data

      setProfile({
        company_name: org.company_name || '',
        registration_number: org.registration_number || '',
        vat_number: org.vat_number || '',
        psira_company_registration: org.psira_company_registration || '',
        address_line1: org.address_line1 || '',
        address_line2: org.address_line2 || '',
        city: org.city || '',
        postal_code: org.postal_code || '',
        phone: org.phone || '',
        billing_email: org.billing_email || '',
        logo_url: org.logo_url || '',
        payslip_template: org.payslip_template || 'professional',
      })

      if (org.logo_url) {
        setLogoPreview(org.logo_url)
      }
    } catch (err: any) {
      toastError('Failed to load profile', err.response?.data?.detail || 'Could not load company profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.put('/api/v1/organizations/current', {
        registration_number: profile.registration_number || null,
        vat_number: profile.vat_number || null,
        psira_company_registration: profile.psira_company_registration || null,
        address_line1: profile.address_line1 || null,
        address_line2: profile.address_line2 || null,
        city: profile.city || null,
        postal_code: profile.postal_code || null,
        phone: profile.phone || null,
        billing_email: profile.billing_email || null,
        logo_url: profile.logo_url || null,
        payslip_template: profile.payslip_template,
      })
      toastSuccess('Profile saved', 'Company profile has been updated successfully.')
    } catch (err: any) {
      toastError('Save failed', err.response?.data?.detail || 'Could not save company profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      toastError('Invalid file type', 'Please upload a JPG or PNG image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError('File too large', 'Logo must be under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setLogoPreview(dataUrl)
      setProfile((prev) => ({ ...prev, logo_url: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleLogoFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoFile(file)
  }

  const removeLogo = () => {
    setLogoPreview(null)
    setProfile((prev) => ({ ...prev, logo_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <form onSubmit={handleSave}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Settings &gt; Company Profile
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Company Profile
              </h1>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-6">
            {/* Company Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Company Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={profile.company_name}
                    readOnly
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Company name cannot be changed here. Contact support if needed.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Registration Number (CIPC)
                  </label>
                  <input
                    type="text"
                    value={profile.registration_number}
                    onChange={(e) => handleChange('registration_number', e.target.value)}
                    placeholder="e.g. 2024/123456/07"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={profile.vat_number}
                    onChange={(e) => handleChange('vat_number', e.target.value)}
                    placeholder="e.g. 4012345678"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    PSIRA Company Registration
                  </label>
                  <input
                    type="text"
                    value={profile.psira_company_registration}
                    onChange={(e) => handleChange('psira_company_registration', e.target.value)}
                    placeholder="PSIRA registration number (if security company)"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Company Address */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Company Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={profile.address_line1}
                    onChange={(e) => handleChange('address_line1', e.target.value)}
                    placeholder="Street address"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={profile.address_line2}
                    onChange={(e) => handleChange('address_line2', e.target.value)}
                    placeholder="Suite, unit, building (optional)"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Johannesburg"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={profile.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder="e.g. 2001"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. +27 11 123 4567"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Payslip Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Payslip Settings
              </h2>

              {/* Logo Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Company Logo
                </label>
                {logoPreview ? (
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-32 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Change Logo
                      </button>
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="px-4 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Remove Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <svg
                      className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        Click to upload
                      </span>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      JPG or PNG, max 2MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Payslip Template Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Payslip Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PAYSLIP_TEMPLATES.map((template) => (
                    <label
                      key={template.id}
                      className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        profile.payslip_template === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payslip_template"
                        value={template.id}
                        checked={profile.payslip_template === template.id}
                        onChange={(e) => handleChange('payslip_template', e.target.value)}
                        className="sr-only"
                      />

                      {/* Template Preview Thumbnail */}
                      <div className="w-full h-24 mb-3 rounded-lg overflow-hidden">
                        {template.id === 'professional' && (
                          <div className="w-full h-full bg-white border border-slate-200 p-2 flex flex-col">
                            <div className="flex justify-between items-start mb-1">
                              <div className="w-8 h-4 bg-slate-800 rounded-sm" />
                              <div className="text-right space-y-0.5">
                                <div className="w-12 h-1.5 bg-slate-300 rounded ml-auto" />
                                <div className="w-8 h-1.5 bg-slate-200 rounded ml-auto" />
                              </div>
                            </div>
                            <div className="w-full h-px bg-slate-800 my-1" />
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between">
                                <div className="w-14 h-1.5 bg-slate-200 rounded" />
                                <div className="w-8 h-1.5 bg-slate-200 rounded" />
                              </div>
                              <div className="flex justify-between">
                                <div className="w-10 h-1.5 bg-slate-100 rounded" />
                                <div className="w-6 h-1.5 bg-slate-100 rounded" />
                              </div>
                              <div className="flex justify-between">
                                <div className="w-12 h-1.5 bg-slate-100 rounded" />
                                <div className="w-8 h-1.5 bg-slate-100 rounded" />
                              </div>
                            </div>
                            <div className="w-full h-px bg-slate-300 my-1" />
                            <div className="flex justify-between">
                              <div className="w-10 h-2 bg-slate-800 rounded" />
                              <div className="w-8 h-2 bg-slate-800 rounded" />
                            </div>
                          </div>
                        )}
                        {template.id === 'modern' && (
                          <div className="w-full h-full bg-white border border-slate-200 p-2 flex flex-col">
                            <div className="w-full h-3 bg-blue-500 rounded-t-sm mb-1" />
                            <div className="flex justify-between items-start mb-1">
                              <div className="w-10 h-3 bg-blue-100 rounded" />
                              <div className="w-6 h-1.5 bg-slate-200 rounded" />
                            </div>
                            <div className="flex-1 space-y-1 mt-1">
                              <div className="flex gap-1">
                                <div className="flex-1 h-1.5 bg-blue-50 rounded" />
                                <div className="w-8 h-1.5 bg-blue-100 rounded" />
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 h-1.5 bg-slate-50 rounded" />
                                <div className="w-6 h-1.5 bg-slate-100 rounded" />
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 h-1.5 bg-blue-50 rounded" />
                                <div className="w-8 h-1.5 bg-blue-100 rounded" />
                              </div>
                            </div>
                            <div className="mt-auto pt-1">
                              <div className="w-full h-2 bg-blue-500 rounded-sm" />
                            </div>
                          </div>
                        )}
                        {template.id === 'classic' && (
                          <div className="w-full h-full bg-white border border-slate-200 p-2 flex flex-col">
                            <div className="text-center mb-1">
                              <div className="w-12 h-2 bg-slate-700 rounded mx-auto" />
                              <div className="w-16 h-1 bg-slate-300 rounded mx-auto mt-0.5" />
                            </div>
                            <div className="w-full h-px bg-slate-400 my-0.5" />
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 flex-1">
                              <div className="w-full h-1.5 bg-slate-100 rounded" />
                              <div className="w-full h-1.5 bg-slate-100 rounded" />
                              <div className="w-full h-1.5 bg-slate-50 rounded" />
                              <div className="w-full h-1.5 bg-slate-50 rounded" />
                              <div className="w-full h-1.5 bg-slate-100 rounded" />
                              <div className="w-full h-1.5 bg-slate-100 rounded" />
                            </div>
                            <div className="w-full h-px bg-slate-400 my-0.5" />
                            <div className="flex justify-end">
                              <div className="w-12 h-2 bg-slate-700 rounded" />
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
                        {template.description}
                      </span>

                      {/* Selected indicator */}
                      {profile.payslip_template === template.id && (
                        <div className="absolute top-2 right-2">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Billing Email */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Billing Contact
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={profile.billing_email}
                  onChange={(e) => handleChange('billing_email', e.target.value)}
                  placeholder="accounts@yourcompany.co.za"
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  This email will be used for billing and invoice correspondence.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end mt-6 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
