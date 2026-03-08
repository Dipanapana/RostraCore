'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
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
    employee_number?: string
    id_number?: string
    psira_number?: string
    psira_grade?: string
    position?: string
    department?: string
    tax_number?: string
    bank_name?: string
    account_number?: string
    branch_code?: string
    account_type?: string
  }
  period_start: string
  period_end: string
  payment_date?: string
  total_hours: number
  overtime_hours: number
  gross_pay: number
  expenses_total: number
  net_pay: number
  basic_salary?: number
  overtime_pay?: number
  night_shift_allowance?: number
  sunday_premium?: number
  holiday_premium?: number
  sunday_hours?: number
  holiday_hours?: number
  paye?: number
  uif?: number
  psira_levy?: number
  bargaining_council?: number
  provident_fund?: number
  hospital_cover?: number
  other_deductions_amount?: number
  org_name?: string
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
      const payrollRes = await api.get(`/api/v1/payroll/${payrollId}`)
      setPayroll(payrollRes.data)

      if (payrollRes.data.gross_pay > 0) {
        const deductionsRes = await api.get('/api/v1/payroll-deductions/net-pay', {
          params: {
            gross_monthly: payrollRes.data.gross_pay,
            age: 35,
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
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const maskIdNumber = (id: string) => {
    if (!id || id.length < 10) return id || '-'
    return id.slice(0, 6) + '****' + id.slice(-3)
  }

  const maskAccountNumber = (acc: string) => {
    if (!acc || acc.length < 4) return acc || '-'
    return '****' + acc.slice(-4)
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
      <DashboardLayout>
        <div className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !payroll) {
    return (
      <DashboardLayout>
        <div className="flex-1 p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error || 'Payroll not found'}</span>
          </div>
          <div className="mt-4">
            <PageHeader backHref="/payroll" backLabel="Back to Payroll" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Compute values for the template
  const emp = payroll.employee || {} as any
  const regularHours = payroll.total_hours - payroll.overtime_hours
  const hourlyRate = emp.hourly_rate || 0
  const basicSalary = payroll.basic_salary || (regularHours * hourlyRate)
  const overtimePay = payroll.overtime_pay || (payroll.overtime_hours * hourlyRate * 1.5)
  const nightAllowance = payroll.night_shift_allowance || 0
  const sundayPremium = payroll.sunday_premium || 0
  const holidayPremium = payroll.holiday_premium || 0
  const grossPay = payroll.gross_pay
  const refNumber = `PS-${payroll.employee?.employee_id || '0'}-${payroll.payroll_id}-${payroll.period_start?.slice(0, 7)?.replace('-', '')}`

  // Deduction values
  const paye = payroll.paye || deductions?.paye || 0
  const uif = payroll.uif || deductions?.uif_employee || 0
  const psiraLevy = payroll.psira_levy || 0
  const bargainingCouncil = payroll.bargaining_council || 0
  const providentFund = payroll.provident_fund || 0
  const hospitalCover = payroll.hospital_cover || 0
  const otherDed = payroll.other_deductions_amount || deductions?.other_deductions || 0
  const totalDeductions = deductions?.total_deductions || (paye + uif + psiraLevy + bargainingCouncil + providentFund + hospitalCover + otherDed)
  const netPay = deductions?.net_pay || payroll.net_pay

  // Build earnings rows (only show non-zero)
  const earningsRows: { label: string; hours: string; rate: string; amount: number }[] = []
  if (basicSalary > 0) {
    earningsRows.push({ label: 'Basic Salary', hours: regularHours > 0 ? regularHours.toFixed(1) : '-', rate: hourlyRate > 0 ? formatCurrency(hourlyRate) : '-', amount: basicSalary })
  }
  if (overtimePay > 0) {
    earningsRows.push({ label: 'Overtime @ 1.5x', hours: payroll.overtime_hours.toFixed(1), rate: formatCurrency(hourlyRate * 1.5), amount: overtimePay })
  }
  if (nightAllowance > 0) {
    earningsRows.push({ label: 'Night Shift Allowance', hours: '-', rate: '-', amount: nightAllowance })
  }
  if (sundayPremium > 0) {
    earningsRows.push({ label: 'Sunday Premium @ 1.5x', hours: (payroll.sunday_hours || 0).toFixed(1), rate: '-', amount: sundayPremium })
  }
  if (holidayPremium > 0) {
    earningsRows.push({ label: 'Public Holiday @ 2x', hours: (payroll.holiday_hours || 0).toFixed(1), rate: '-', amount: holidayPremium })
  }
  if (payroll.expenses_total > 0) {
    earningsRows.push({ label: 'Travel Allowance', hours: '-', rate: '-', amount: payroll.expenses_total })
  }

  // Build deduction rows (only show non-zero)
  const deductionRows: { label: string; amount: number }[] = []
  if (paye > 0) deductionRows.push({ label: 'PAYE (Income Tax)', amount: paye })
  if (uif > 0) deductionRows.push({ label: 'UIF Contribution', amount: uif })
  if (psiraLevy > 0) deductionRows.push({ label: 'PSIRA Levy', amount: psiraLevy })
  if (bargainingCouncil > 0) deductionRows.push({ label: 'Bargaining Council', amount: bargainingCouncil })
  if (providentFund > 0) deductionRows.push({ label: 'Provident Fund', amount: providentFund })
  if (hospitalCover > 0) deductionRows.push({ label: 'Medical Aid', amount: hospitalCover })
  if (otherDed > 0) deductionRows.push({ label: 'Other Deductions', amount: otherDed })

  // Employee info grid rows
  const employeeName = emp.name || 'Unknown'
  const employeeNumber = emp.employee_number || `EMP${String(emp.employee_id || 0).padStart(4, '0')}`

  return (
    <DashboardLayout>
      <main className="flex-1 p-8">
        {/* Page Header with actions */}
        <div className="mb-6 print:hidden">
          <PageHeader
            backHref="/payroll"
            backLabel="Back to Payroll"
            title="Payslip Details"
            subtitle={`Payroll ID: #${payroll.payroll_id}`}
            icon={<FileText className="w-6 h-6 text-[#2D3748]" />}
            actions={
              <>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A202C] text-white rounded-lg hover:bg-[#2D3748] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Payslip Document - matches PDF template */}
        <div className="bg-white max-w-[850px] mx-auto shadow-lg print:shadow-none print:max-w-none" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>

          {/* === HEADER BAR (Dark charcoal) === */}
          <div className="flex justify-between items-center px-6 py-4" style={{ backgroundColor: '#1A202C' }}>
            <h1 className="text-white text-lg font-bold tracking-wide">PAYSLIP</h1>
            <span className="text-white text-sm opacity-80">Reference: {refNumber}</span>
          </div>

          {/* === COMPANY & PERIOD INFO === */}
          <div className="flex justify-between items-start px-6 py-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#2D3748' }}>
                {(payroll.org_name || 'SECURITY COMPANY').toUpperCase()}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#718096' }}>Security Services Provider</p>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-3 justify-end">
                <span className="text-xs" style={{ color: '#718096' }}>Pay Period:</span>
                <span className="font-semibold text-sm" style={{ color: '#2D3748' }}>
                  {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}
                </span>
              </div>
              {payroll.payment_date && (
                <div className="flex items-center gap-3 justify-end mt-1">
                  <span className="text-xs" style={{ color: '#718096' }}>Payment Date:</span>
                  <span className="font-semibold text-sm" style={{ color: '#2D3748' }}>
                    {formatDate(payroll.payment_date)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 border-t" style={{ borderColor: '#CBD5E0' }} />

          {/* === EMPLOYEE INFORMATION GRID === */}
          <div className="px-6 pt-4 pb-3">
            <h3 className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#2D3748' }}>EMPLOYEE INFORMATION</h3>
            <div className="border" style={{ borderColor: '#CBD5E0' }}>
              {/* Row 1 */}
              <div className="grid grid-cols-4" style={{ backgroundColor: '#F7FAFC' }}>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>Employee Name</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{employeeName}</p>
                </div>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>Employee Number</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{employeeNumber}</p>
                </div>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>ID Number</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{maskIdNumber(emp.id_number || '')}</p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-[10px]" style={{ color: '#718096' }}>Tax Reference</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{emp.tax_number || '-'}</p>
                </div>
              </div>
              {/* Row 2 */}
              <div className="grid grid-cols-4 border-t" style={{ borderColor: '#CBD5E0' }}>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>Position</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{emp.position || 'Security Officer'}</p>
                </div>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>Department</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{emp.department || 'Security Operations'}</p>
                </div>
                <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                  <p className="text-[10px]" style={{ color: '#718096' }}>PSIRA Number</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{emp.psira_number || '-'}</p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-[10px]" style={{ color: '#718096' }}>PSIRA Grade</p>
                  <p className="text-sm font-bold" style={{ color: '#2D3748' }}>{emp.psira_grade || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* === EARNINGS & DEDUCTIONS (Side by side) === */}
          <div className="px-6 py-3">
            <div className="flex gap-4">
              {/* EARNINGS TABLE */}
              <div className="flex-1">
                <h3 className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#2D3748' }}>EARNINGS</h3>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#EDF2F7' }}>
                      <th className="text-left px-2 py-1.5 text-xs font-bold" style={{ color: '#2D3748', borderBottom: '1px solid #CBD5E0' }}>Description</th>
                      <th className="text-right px-2 py-1.5 text-xs font-bold" style={{ color: '#2D3748', borderBottom: '1px solid #CBD5E0' }}>Hours</th>
                      <th className="text-right px-2 py-1.5 text-xs font-bold" style={{ color: '#2D3748', borderBottom: '1px solid #CBD5E0' }}>Rate</th>
                      <th className="text-right px-2 py-1.5 text-xs font-bold" style={{ color: '#2D3748', borderBottom: '1px solid #CBD5E0' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earningsRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < earningsRows.length - 1 ? '0.5px solid #CBD5E0' : 'none' }}>
                        <td className="px-2 py-1.5 text-xs" style={{ color: '#2D3748' }}>{row.label}</td>
                        <td className="px-2 py-1.5 text-xs text-right" style={{ color: '#2D3748' }}>{row.hours}</td>
                        <td className="px-2 py-1.5 text-xs text-right" style={{ color: '#2D3748' }}>{row.rate}</td>
                        <td className="px-2 py-1.5 text-xs text-right" style={{ color: '#2D3748' }}>{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                    {/* GROSS PAY total row */}
                    <tr style={{ backgroundColor: '#EDF2F7', borderTop: '1px solid #2D3748' }}>
                      <td colSpan={3} className="px-2 py-2 text-xs font-bold" style={{ color: '#2D3748' }}>GROSS PAY</td>
                      <td className="px-2 py-2 text-xs font-bold text-right" style={{ color: '#2D3748' }}>{formatCurrency(grossPay)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* DEDUCTIONS TABLE */}
              <div className="w-[280px] flex-shrink-0">
                <h3 className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#742A2A' }}>DEDUCTIONS</h3>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#EDF2F7' }}>
                      <th className="text-left px-2 py-1.5 text-xs font-bold" style={{ color: '#742A2A', borderBottom: '1px solid #CBD5E0' }}>Description</th>
                      <th className="text-right px-2 py-1.5 text-xs font-bold" style={{ color: '#742A2A', borderBottom: '1px solid #CBD5E0' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductionRows.length > 0 ? deductionRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < deductionRows.length - 1 ? '0.5px solid #CBD5E0' : 'none' }}>
                        <td className="px-2 py-1.5 text-xs" style={{ color: '#2D3748' }}>{row.label}</td>
                        <td className="px-2 py-1.5 text-xs text-right" style={{ color: '#2D3748' }}>{formatCurrency(row.amount)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={2} className="px-2 py-1.5 text-xs text-center" style={{ color: '#718096' }}>No deductions</td>
                      </tr>
                    )}
                    {/* TOTAL DEDUCTIONS row */}
                    <tr style={{ backgroundColor: '#EDF2F7', borderTop: '1px solid #742A2A' }}>
                      <td className="px-2 py-2 text-xs font-bold" style={{ color: '#742A2A' }}>TOTAL DEDUCTIONS</td>
                      <td className="px-2 py-2 text-xs font-bold text-right" style={{ color: '#742A2A' }}>{formatCurrency(totalDeductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* === NET PAY BAR (Green) === */}
          <div className="mx-6 my-3 flex justify-between items-center px-6 py-4 rounded-sm" style={{ backgroundColor: '#276749' }}>
            <span className="text-white text-base font-bold">NET PAY</span>
            <span className="text-white text-2xl font-bold">{formatCurrency(netPay)}</span>
          </div>

          {/* === PAYMENT METHOD === */}
          {(emp.bank_name || emp.account_number) && (
            <div className="px-6 py-3">
              <h3 className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#2D3748' }}>PAYMENT METHOD</h3>
              <div className="border" style={{ borderColor: '#CBD5E0', backgroundColor: '#F7FAFC' }}>
                <div className="grid grid-cols-4">
                  <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                    <p className="text-[10px]" style={{ color: '#718096' }}>Bank</p>
                    <p className="text-xs font-bold" style={{ color: '#2D3748' }}>{emp.bank_name || '-'}</p>
                  </div>
                  <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                    <p className="text-[10px]" style={{ color: '#718096' }}>Account Number</p>
                    <p className="text-xs font-bold" style={{ color: '#2D3748' }}>{maskAccountNumber(emp.account_number || '')}</p>
                  </div>
                  <div className="px-3 py-2 border-r" style={{ borderColor: '#CBD5E0' }}>
                    <p className="text-[10px]" style={{ color: '#718096' }}>Branch Code</p>
                    <p className="text-xs font-bold" style={{ color: '#2D3748' }}>{emp.branch_code || '-'}</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px]" style={{ color: '#718096' }}>Account Type</p>
                    <p className="text-xs font-bold" style={{ color: '#2D3748' }}>{emp.account_type || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === FOOTER === */}
          <div className="mx-6 mt-4 mb-2 border-t pt-3 pb-4 text-center" style={{ borderColor: '#CBD5E0' }}>
            <p className="text-[10px]" style={{ color: '#718096' }}>
              This is a computer-generated payslip. | Generated: {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} | All amounts in South African Rand (ZAR)
            </p>
            <p className="text-[9px] mt-1" style={{ color: '#9CA3AF' }}>
              Please review your payslip carefully. Any queries should be raised within 7 days. For questions, contact your payroll administrator.
            </p>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
