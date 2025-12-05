'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import {
  FileText,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Download,
  User,
  Calendar,
  Clock,
  DollarSign,
  Calculator
} from 'lucide-react'
import api from '@/services/api'

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

  const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
  const [deductions, setDeductions] = useState<SADeductions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </main>
      </div>
    )
  }

  if (error || !payroll) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-400">{error || 'Payroll not found'}</span>
          </div>
          <Link href="/payroll" className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-700">
            <ArrowLeft className="w-4 h-4" />
            Back to Payroll
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/payroll"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                Payslip Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Payroll ID: #{payroll.payroll_id}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Print / Download
          </button>
        </div>

        {/* Payslip Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden print:shadow-none">
          {/* Company Header */}
          <div className="bg-purple-600 text-white p-6">
            <h2 className="text-xl font-bold">PAYSLIP</h2>
            <p className="text-purple-200">South African Security Services</p>
          </div>

          {/* Employee & Period Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b dark:border-slate-700">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                Employee Details
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-900 dark:text-white font-medium">{payroll.employee?.name || 'Unknown'}</p>
                <p className="text-gray-600 dark:text-gray-400">Employee ID: {payroll.employee?.employee_id}</p>
                <p className="text-gray-600 dark:text-gray-400">Hourly Rate: {formatCurrency(payroll.employee?.hourly_rate || 0)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Pay Period
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-900 dark:text-white">{formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}</p>
              </div>
            </div>
          </div>

          {/* Hours Worked */}
          <div className="p-6 border-b dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-purple-600" />
              Hours Worked
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Regular Hours</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {(payroll.total_hours - payroll.overtime_hours).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Overtime Hours</p>
                <p className="text-xl font-bold text-orange-600">{payroll.overtime_hours.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                <p className="text-xl font-bold text-purple-600">{payroll.total_hours.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="p-6 border-b dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-600" />
              Earnings
            </h3>
            <table className="w-full">
              <tbody className="text-sm">
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 text-gray-600 dark:text-gray-400">Gross Pay</td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(payroll.gross_pay)}
                  </td>
                </tr>
                {payroll.expenses_total > 0 && (
                  <tr className="border-b dark:border-slate-700">
                    <td className="py-2 text-gray-600 dark:text-gray-400">Travel Reimbursement</td>
                    <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payroll.expenses_total)}
                    </td>
                  </tr>
                )}
                <tr className="bg-green-50 dark:bg-green-900/20">
                  <td className="py-2 px-2 font-semibold text-green-700 dark:text-green-400">Total Earnings</td>
                  <td className="py-2 px-2 text-right font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(payroll.gross_pay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SA Statutory Deductions */}
          {deductions && (
            <div className="p-6 border-b dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-red-600" />
                Statutory Deductions (South Africa)
              </h3>
              <table className="w-full">
                <tbody className="text-sm">
                  <tr className="border-b dark:border-slate-700">
                    <td className="py-2 text-gray-600 dark:text-gray-400">
                      PAYE (Pay As You Earn)
                      <span className="text-xs text-gray-400 ml-2">Income Tax</span>
                    </td>
                    <td className="py-2 text-right font-medium text-red-600">
                      -{formatCurrency(deductions.paye)}
                    </td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="py-2 text-gray-600 dark:text-gray-400">
                      UIF (Employee)
                      <span className="text-xs text-gray-400 ml-2">1% of earnings, max R177.12</span>
                    </td>
                    <td className="py-2 text-right font-medium text-red-600">
                      -{formatCurrency(deductions.uif_employee)}
                    </td>
                  </tr>
                  {deductions.other_deductions > 0 && (
                    <tr className="border-b dark:border-slate-700">
                      <td className="py-2 text-gray-600 dark:text-gray-400">Other Deductions</td>
                      <td className="py-2 text-right font-medium text-red-600">
                        -{formatCurrency(deductions.other_deductions)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-red-50 dark:bg-red-900/20">
                    <td className="py-2 px-2 font-semibold text-red-700 dark:text-red-400">Total Deductions</td>
                    <td className="py-2 px-2 text-right font-bold text-red-700 dark:text-red-400">
                      -{formatCurrency(deductions.total_deductions)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Employer Contributions Info */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Employer Contributions:</strong> UIF (1%): {formatCurrency(deductions.employer_uif)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Note: SDL (Skills Development Levy) of 1% applies to employers with annual payroll exceeding R500,000
                </p>
              </div>
            </div>
          )}

          {/* Net Pay */}
          <div className="p-6 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">NET PAY</h3>
                <p className="text-sm text-purple-600 dark:text-purple-400">Amount payable to employee</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(deductions ? deductions.net_pay : payroll.net_pay)}
                </p>
                {deductions && (
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Effective tax rate: {deductions.effective_tax_rate.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This payslip is generated based on SA tax rates for 2024/2025 tax year.
              Calculations include PAYE, UIF, and applicable rebates.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
