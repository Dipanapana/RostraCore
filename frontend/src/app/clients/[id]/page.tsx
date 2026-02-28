'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Banknote,
  CalendarClock,
  FileText,
  Pencil,
  MapPinned,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Ban,
  Trash2,
  Users,
  UserPlus,
  Shield,
  X,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { clientsApi, invoiceApi, api, guardRestrictionsApi } from '@/services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientDetail {
  client_id: number
  client_name: string
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  billing_rate: number | null
  target_margin_pct: number | null
  status: string
  notes: string | null
  site_count?: number
  // Company registration & compliance
  registration_number: string | null
  company_type: string | null
  income_tax_number: string | null
  bbee_level: number | null
  bbee_certificate_expiry: string | null
  industry_sector: string | null
  // Payment terms
  payment_terms_days: number | null
  requires_purchase_order: boolean | null
  // Billing
  vat_number: string | null
  billing_address: string | null
  billing_email: string | null
  billing_contact_name: string | null
  // Operations contact
  operations_contact_name: string | null
  operations_contact_email: string | null
  operations_contact_phone: string | null
  // Emergency contact
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  // Location
  province: string | null
  city: string | null
}

interface SiteRow {
  site_id: number
  site_name: string
  address: string | null
  min_staff: number
  billing_rate: number | null
  required_skill: string | null
}

interface InvoiceRow {
  invoice_id: number
  invoice_number?: string
  period_start: string
  period_end: string
  total_amount: number
  status: string
  due_date?: string | null
  issue_date?: string
  created_at?: string
}

interface GuardRestriction {
  restriction_id: number
  employee_id: number
  employee_name: string
  client_id: number | null
  client_name: string | null
  site_id: number | null
  site_name: string | null
  reason: string | null
  created_at: string
}

interface GuardRow {
  employee_id: number
  first_name: string
  last_name: string
  role: string
  status: string
  assigned_client_id: number | null
  assigned_client_ids: number[] | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy') } catch { return iso }
}

function contractStatus(client: ClientDetail): { label: string; color: string } {
  if (!client.contract_end_date) return { label: 'No End Date', color: 'text-gray-500 bg-gray-100' }
  const daysLeft = differenceInDays(parseISO(client.contract_end_date), new Date())
  if (daysLeft < 0) return { label: 'Expired', color: 'text-red-700 bg-red-50 border border-red-200' }
  if (daysLeft <= 30) return { label: `Expiring in ${daysLeft}d`, color: 'text-amber-700 bg-amber-50 border border-amber-200' }
  return { label: 'Active', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' }
}

const INVOICE_STATUS: Record<string, { label: string; classes: string }> = {
  draft:     { label: 'Draft',     classes: 'bg-gray-100 text-gray-600' },
  pending:   { label: 'Pending',   classes: 'bg-amber-50 text-amber-700' },
  sent:      { label: 'Sent',      classes: 'bg-blue-50 text-blue-700' },
  paid:      { label: 'Paid',      classes: 'bg-emerald-50 text-emerald-700' },
  overdue:   { label: 'Overdue',   classes: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500' },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({ label, value, icon: Icon }: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-gray-800 font-medium">{value ?? '—'}</div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function EmptyNote({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-gray-400">{message}</p>
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const clientId = Number(id)

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [sites, setSites] = useState<SiteRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [restrictions, setRestrictions] = useState<GuardRestriction[]>([])
  const [allGuards, setAllGuards] = useState<GuardRow[]>([])
  const [showAssignGuardModal, setShowAssignGuardModal] = useState(false)
  const [guardSearch, setGuardSearch] = useState('')
  const [guardAssigning, setGuardAssigning] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return

    async function load() {
      setLoading(true)
      const [clientRes, sitesRes, invoicesRes, restrictRes, guardsRes] = await Promise.allSettled([
        clientsApi.getById(clientId),
        api.get(`/api/v1/clients/${clientId}/sites`),
        invoiceApi.list({ client_id: clientId, limit: 8 }),
        guardRestrictionsApi.list({ client_id: clientId }),
        api.get('/api/v1/employees?limit=500'),
      ])

      if (clientRes.status === 'fulfilled') {
        setClient(clientRes.value.data)
      } else {
        setError('Client not found.')
        setLoading(false)
        return
      }

      if (sitesRes.status === 'fulfilled') {
        const data = sitesRes.value.data
        setSites(Array.isArray(data) ? data : data?.sites ?? [])
      }

      if (invoicesRes.status === 'fulfilled') {
        const data = invoicesRes.value.data
        setInvoices(Array.isArray(data) ? data : data?.invoices ?? [])
      }

      if (restrictRes.status === 'fulfilled') {
        setRestrictions(restrictRes.value.data ?? [])
      }

      if (guardsRes.status === 'fulfilled') {
        const data = guardsRes.value.data
        setAllGuards(Array.isArray(data) ? data : [])
      }

      setLoading(false)
    }

    load()
  }, [clientId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <p className="text-gray-500">{error ?? 'Client not found.'}</p>
          <div className="mt-4">
            <PageHeader backHref="/clients" backLabel="Back to Clients" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isGuardAssignedHere = (g: GuardRow) =>
    g.assigned_client_id === clientId ||
    (Array.isArray(g.assigned_client_ids) && g.assigned_client_ids.includes(clientId))

  const assignedGuards = allGuards.filter(isGuardAssignedHere)
  const availableGuards = allGuards.filter(
    (g) => !isGuardAssignedHere(g) && (g.status === 'ACTIVE' || g.status === 'active')
  )

  const handleAssignGuard = async (guard: GuardRow) => {
    setGuardAssigning(guard.employee_id)
    const currentIds = Array.isArray(guard.assigned_client_ids) ? guard.assigned_client_ids : []
    const newIds = currentIds.includes(clientId) ? currentIds : [...currentIds, clientId]
    try {
      await api.put(`/api/v1/employees/${guard.employee_id}`, { assigned_client_ids: newIds })
      setAllGuards((prev) =>
        prev.map((g) => g.employee_id === guard.employee_id ? { ...g, assigned_client_ids: newIds } : g)
      )
      setShowAssignGuardModal(false)
      setGuardSearch('')
    } catch {
      alert('Failed to assign guard. Please try again.')
    } finally {
      setGuardAssigning(null)
    }
  }

  const handleUnassignGuard = async (guard: GuardRow) => {
    if (!confirm(`Remove ${guard.first_name} ${guard.last_name} from this client?`)) return
    setGuardAssigning(guard.employee_id)
    const currentIds = Array.isArray(guard.assigned_client_ids) ? guard.assigned_client_ids : []
    const newIds = currentIds.filter((id) => id !== clientId)
    const newSingleId = guard.assigned_client_id === clientId ? null : guard.assigned_client_id
    try {
      await api.put(`/api/v1/employees/${guard.employee_id}`, {
        assigned_client_ids: newIds,
        assigned_client_id: newSingleId,
      })
      setAllGuards((prev) =>
        prev.map((g) =>
          g.employee_id === guard.employee_id
            ? { ...g, assigned_client_ids: newIds, assigned_client_id: newSingleId }
            : g
        )
      )
    } catch {
      alert('Failed to remove guard. Please try again.')
    } finally {
      setGuardAssigning(null)
    }
  }

  const handleRemoveRestriction = async (restrictionId: number) => {
    setRestrictions((prev) => prev.filter((r) => r.restriction_id !== restrictionId))
    try {
      await guardRestrictionsApi.remove(restrictionId)
    } catch {
      const res = await guardRestrictionsApi.list({ client_id: clientId })
      setRestrictions(res.data ?? [])
    }
  }

  const contractBadge = contractStatus(client)
  const totalInvoiced = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const outstandingAmount = invoices.filter((i) => ['pending', 'sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_amount, 0)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        <PageHeader backHref="/clients" backLabel="Back to Clients" />

        {/* Hero card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Building2 className="w-8 h-8 text-white" />
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-gray-900">{client.client_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${contractBadge.color}`}>
                  {contractBadge.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  client.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {client.status.toUpperCase()}
                </span>
              </div>
              {client.contact_person && (
                <p className="text-gray-500 text-sm">Contact: {client.contact_person}</p>
              )}
            </div>

            {/* Edit action */}
            <Link
              href="/clients"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit Client
            </Link>
          </div>

          {/* Financial stats */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Billing Rate</p>
              <p className="text-lg font-bold text-gray-900">
                {client.billing_rate ? `R${client.billing_rate}/hr` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Sites</p>
              <p className="text-lg font-bold text-gray-900">
                {client.site_count ?? sites.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-lg font-bold text-emerald-600">
                R{totalInvoiced.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Outstanding</p>
              <p className={`text-lg font-bold ${outstandingAmount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                R{outstandingAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Contact & Contract details */}
          <div className="space-y-4">
            <Section title="Primary Contact" icon={Mail}>
              <div className="space-y-0">
                <InfoRow label="Contact Person" value={client.contact_person} icon={Building2} />
                <InfoRow
                  label="Email"
                  value={client.contact_email ? (
                    <a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:underline">
                      {client.contact_email}
                    </a>
                  ) : null}
                  icon={Mail}
                />
                <InfoRow label="Phone" value={client.contact_phone} icon={Phone} />
                <InfoRow label="Address" value={client.address} icon={MapPin} />
                {client.province && <InfoRow label="Province" value={client.province} icon={MapPin} />}
                {client.city && <InfoRow label="City" value={client.city} icon={MapPin} />}
              </div>
            </Section>

            {(client.operations_contact_name || client.emergency_contact_name) && (
              <Section title="Other Contacts" icon={Phone}>
                <div className="space-y-0">
                  {client.operations_contact_name && (
                    <>
                      <InfoRow label="Operations Contact" value={client.operations_contact_name} icon={Building2} />
                      {client.operations_contact_email && <InfoRow label="Ops Email" value={<a href={`mailto:${client.operations_contact_email}`} className="text-blue-600 hover:underline">{client.operations_contact_email}</a>} icon={Mail} />}
                      {client.operations_contact_phone && <InfoRow label="Ops Phone" value={client.operations_contact_phone} icon={Phone} />}
                    </>
                  )}
                  {client.emergency_contact_name && (
                    <>
                      <InfoRow label="Emergency Contact" value={client.emergency_contact_name} icon={Phone} />
                      {client.emergency_contact_phone && <InfoRow label="Emergency Phone" value={client.emergency_contact_phone} icon={Phone} />}
                    </>
                  )}
                </div>
              </Section>
            )}

            <Section title="Contract & Billing" icon={CalendarClock}>
              <div className="space-y-0">
                <InfoRow label="Start Date" value={fmtDate(client.contract_start_date)} icon={CalendarClock} />
                <InfoRow label="End Date" value={fmtDate(client.contract_end_date)} icon={CalendarClock} />
                <InfoRow label="Billing Rate" value={client.billing_rate ? `R${client.billing_rate}/hr` : null} icon={Banknote} />
                {client.target_margin_pct != null && <InfoRow label="Target Margin" value={`${client.target_margin_pct}%`} icon={Banknote} />}
                {client.payment_terms_days && <InfoRow label="Payment Terms" value={`Net ${client.payment_terms_days} days`} icon={CalendarClock} />}
                {client.requires_purchase_order && <InfoRow label="Requires PO" value="Yes" icon={FileText} />}
                {client.vat_number && <InfoRow label="VAT Number" value={client.vat_number} icon={FileText} />}
                {client.billing_contact_name && <InfoRow label="Billing Contact" value={client.billing_contact_name} icon={Building2} />}
                {client.billing_email && <InfoRow label="Billing Email" value={<a href={`mailto:${client.billing_email}`} className="text-blue-600 hover:underline">{client.billing_email}</a>} icon={Mail} />}
              </div>
            </Section>

            {(client.registration_number || client.company_type || client.bbee_level) && (
              <Section title="Registration & Compliance" icon={FileText}>
                <div className="space-y-0">
                  {client.company_type && <InfoRow label="Company Type" value={client.company_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} icon={Building2} />}
                  {client.registration_number && <InfoRow label="CIPC Reg. No." value={client.registration_number} icon={FileText} />}
                  {client.income_tax_number && <InfoRow label="Income Tax No." value={client.income_tax_number} icon={FileText} />}
                  {client.industry_sector && <InfoRow label="Industry" value={client.industry_sector.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} icon={Building2} />}
                  {client.bbee_level && <InfoRow label="B-BBEE Level" value={`Level ${client.bbee_level}`} icon={CheckCircle2} />}
                  {client.bbee_certificate_expiry && <InfoRow label="B-BBEE Expiry" value={fmtDate(client.bbee_certificate_expiry)} icon={CalendarClock} />}
                </div>
              </Section>
            )}
          </div>

          {/* Sites */}
          <Section title={`Sites (${sites.length})`} icon={MapPinned}>
            {sites.length === 0 ? (
              <EmptyNote message="No sites linked to this client." />
            ) : (
              <div className="space-y-3">
                {sites.map((site) => (
                  <Link
                    key={site.site_id}
                    href={`/sites/${site.site_id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {site.site_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{site.address || 'No address'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">Min staff: {site.min_staff}</span>
                        {site.billing_rate && (
                          <span className="text-xs text-gray-400">R{site.billing_rate}/hr</span>
                        )}
                        {site.required_skill && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                            {site.required_skill}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* Recent Invoices */}
          <Section title="Recent Invoices" icon={FileText}>
            {invoices.length === 0 ? (
              <EmptyNote message="No invoices found for this client." />
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => {
                  const s = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.pending
                  return (
                    <Link
                      key={inv.invoice_id}
                      href={`/billing/invoices/${inv.invoice_id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {inv.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : inv.status === 'overdue' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : inv.status === 'cancelled' ? (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {inv.invoice_number ?? `INV-${inv.invoice_id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">
                          R{inv.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${s.classes}`}>{s.label}</span>
                      </div>
                    </Link>
                  )
                })}
                <Link
                  href={`/billing/invoices?client_id=${clientId}`}
                  className="block text-center text-xs text-blue-600 hover:underline mt-2 pt-2 border-t border-gray-100"
                >
                  View all invoices →
                </Link>
              </div>
            )}
          </Section>

        </div>

        {/* Assigned Guards */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Assigned Guards{assignedGuards.length > 0 && ` (${assignedGuards.length})`}
              </h2>
            </div>
            <button
              onClick={() => { setShowAssignGuardModal(true); setGuardSearch('') }}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Assign Guard
            </button>
          </div>
          <div className="p-6">
            {assignedGuards.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No guards assigned. Assigned guards will be prioritised for this client&apos;s shifts during roster generation.
              </p>
            ) : (
              <div className="space-y-2">
                {assignedGuards.map((g) => (
                  <div key={g.employee_id} className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{g.first_name} {g.last_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{g.role}</p>
                      </div>
                    </div>
                    <button
                      disabled={guardAssigning === g.employee_id}
                      onClick={() => handleUnassignGuard(g)}
                      className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                      title="Remove from client"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assign Guard Modal */}
        {showAssignGuardModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Assign Guard to Client</h3>
                <button onClick={() => setShowAssignGuardModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {availableGuards
                    .filter((g) => {
                      if (!guardSearch) return true
                      const q = guardSearch.toLowerCase()
                      return `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) || g.role.toLowerCase().includes(q)
                    })
                    .map((g) => (
                      <button
                        key={g.employee_id}
                        disabled={guardAssigning === g.employee_id}
                        onClick={() => handleAssignGuard(g)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">{g.first_name} {g.last_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{g.role}</div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">Assign →</span>
                      </button>
                    ))}
                  {availableGuards.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">All active guards are already assigned to this client.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restricted Guards */}
        {restrictions.length > 0 && (
          <Section title={`Restricted Guards (${restrictions.length})`} icon={Ban}>
            <div className="space-y-2">
              {restrictions.map((r) => (
                <div
                  key={r.restriction_id}
                  className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-100 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Ban className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/employees/${r.employee_id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-red-600 transition-colors"
                      >
                        {r.employee_name}
                      </Link>
                      {r.reason && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{r.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRestriction(r.restriction_id)}
                    className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                    title="Lift restriction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {client.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Client Notes</p>
            <p className="text-sm text-amber-800 leading-relaxed">{client.notes}</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
