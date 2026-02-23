'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PageHeader from '@/components/ui/PageHeader'
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  User,
  Calendar,
  Clock,
  DollarSign,
  Calculator,
  Printer
} from 'lucide-react'
import api from '@/services/api'
import { getApiUrl } from '@/lib/config'
import { useAuth } from '@/context/AuthContext'

interface PayrollDetail {
  payroll_id: number
  employee: {
    employee_id: number
    name: string
    hourly_rate: number
  }
  period_start: string
  period_end: string
  total_hours: number
  overtime_hours: number
  gross_pay: number
  expenses_total: number
  net_pay: number
}

interface SADeductions {
  gross_pay: number
  paye: number
  uif_employee: number
  other_deductions: number
  total_deductions: number
  net_pay: number
  employer_uif: number
  effective_tax_rate: number
}

export default function PayslipDetailPage() {
  const params = useParams()
  const payrollId = params.id as string
  const { token } = useAuth()

  const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
  const [deductions, setDeductions] = useState<SADeductions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (payrollId) {
      fetchPayrollData()
    }
  }, [payrollId])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      // Fetch payroll details
      const payrollRes = await api.get(`/api/v1/payroll/${payrollId}`)
      setPayroll(payrollRes.data)

      // Calculate SA deductions based on gross pay
      if (payrollRes.data.gross_pay > 0) {
        const deductionsRes = await api.get('/api/v1/payroll-deductions/net-pay', {
          params: {
            gross_monthly: payrollRes.data.gross_pay,
            age: 35, // Default age
            other_deductions: 0
          }
        })
        setDeductions(deductionsRes.data)
      }

      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payslip data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleDownloadPDF = async () => {
    if (!payroll) return

    setDownloading(true)
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/${payrollId}/payslip/pdf`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payslip_${payroll.employee?.name?.replace(/\s+/g, '_') || payrollId}_${payroll.period_end}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to download payslip PDF')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download payslip PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    )
  }

  if (error || !payroll) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error || 'Payroll not found'}</span>
          </div>
          <div className="mt-4">
            <PageHeader backHref="/payroll" backLabel="Back to Payroll" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            backHref="/payroll"
            backLabel="Back to Payroll"
            title="Payslip Details"
            subtitle={`Payroll ID: #${payroll.payroll_id}`}
            icon={<FileText className="w-6 h-6 text-blue-600" />}
            actions={
              <>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </>
            }
          />
        </div>

        {/* Payslip Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none">
          {/* Company Header */}
          <div className="bg-blue-600 text-white p-6">
            <h2 className="text-xl font-bold">PAYSLIP</h2>
            <p className="text-blue-200">South African Security Services</p>
          </div>

          {/* Employee & Period Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Employee Details
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-900 font-medium">{payroll.employee?.name || 'Unknown'}</p>
                <p className="text-gray-600">Employee ID: {payroll.employee?.employee_id}</p>
                <p className="text-gray-600">Hourly Rate: {formatCurrency(payroll.employee?.hourly_rate || 0)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Pay Period
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-900">{formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}</p>
              </div>
            </div>
          </div>

          {/* Hours Worked */}
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-blue-600" />
              Hours Worked
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Regular Hours</p>
                <p className="text-xl font-bold text-gray-900">
                  {(payroll.total_hours - payroll.overtime_hours).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Overtime Hours</p>
                <p className="text-xl font-bold text-orange-600">{payroll.overtime_hours.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-xl font-bold text-blue-600">{payroll.total_hours.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-600" />
              Earnings
            </h3>
            <table className="w-full">
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-2 text-gray-600">Gross Pay</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {formatCurrency(payroll.gross_pay)}
                  </td>
                </tr>
                {payroll.expenses_total > 0 && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Travel Reimbursement</td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(payroll.expenses_total)}
                    </td>
                  </tr>
                )}
                <tr className="bg-green-50">
                  <td className="py-2 px-2 font-semibold text-green-700">Total Earnings</td>
                  <td className="py-2 px-2 text-right font-bold text-green-700">
                    {formatCurrency(payroll.gross_pay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SA Statutory Deductions */}
          {deductions && (
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-red-600" />
                Statutory Deductions (South Africa)
              </h3>
              <table className="w-full">
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">
                      PAYE (Pay As You Earn)
                      <span className="text-xs text-gray-400 ml-2">Income Tax</span>
                    </td>
                    <td className="py-2 text-right font-medium text-red-600">
                      -{formatCurrency(deductions.paye)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">
                      UIF (Employee)
                      <span className="text-xs text-gray-400 ml-2">1% of earnings, max R177.12</span>
                    </td>
                    <td className="py-2 text-right font-medium text-red-600">
                      -{formatCurrency(deductions.uif_employee)}
                    </td>
                  </tr>
                  {deductions.other_deductions > 0 && (
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">Other Deductions</td>
                      <td className="py-2 text-right font-medium text-red-600">
                        -{formatCurrency(deductions.other_deductions)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-red-50">
                    <td className="py-2 px-2 font-semibold text-red-700">Total Deductions</td>
                    <td className="py-2 px-2 text-right font-bold text-red-700">
                      -{formatCurrency(deductions.total_deductions)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Employer Contributions Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Employer Contributions:</strong> UIF (1%): {formatCurrency(deductions.employer_uif)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Note: SDL (Skills Development Levy) of 1% applies to employers with annual payroll exceeding R500,000
                </p>
              </div>
            </div>
          )}

          {/* Net Pay */}
          <div className="p-6 bg-blue-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-blue-900">NET PAY</h3>
                <p className="text-sm text-blue-600">Amount payable to employee</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-700">
                  {formatCurrency(deductions ? deductions.net_pay : payroll.net_pay)}
                </p>
                {deductions && (
                  <p className="text-sm text-blue-600">
                    Effective tax rate: {deductions.effective_tax_rate.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              This payslip is generated based on SA tax rates for 2024/2025 tax year.
              Calculations include PAYE, UIF, and applicable rebates.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
