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
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
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
  status: string
  notes: string | null
  site_count?: number
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy') } catch { return iso }
}

function contractStatus(client: ClientDetail): { label: string; color: string } {
  if (!client.contract_end_date) return { label: 'No End Date', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' }
  const daysLeft = differenceInDays(parseISO(client.contract_end_date), new Date())
  if (daysLeft < 0) return { label: 'Expired', color: 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' }
  if (daysLeft <= 30) return { label: `Expiring in ${daysLeft}d`, color: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800' }
  return { label: 'Active', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' }
}

const INVOICE_STATUS: Record<string, { label: string; classes: string }> = {
  draft:     { label: 'Draft',     classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  pending:   { label: 'Pending',   classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  sent:      { label: 'Sent',      classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  paid:      { label: 'Paid',      classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  overdue:   { label: 'Overdue',   classes: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500' },
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
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-slate-800 dark:text-slate-200 font-medium">{value ?? '—'}</div>
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
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function EmptyNote({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{message}</p>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return

    async function load() {
      setLoading(true)
      const [clientRes, sitesRes, invoicesRes, restrictRes] = await Promise.allSettled([
        clientsApi.getById(clientId),
        api.get(`/api/v1/clients/${clientId}/sites`),
        invoiceApi.list({ client_id: clientId, limit: 8 }),
        guardRestrictionsApi.list({ client_id: clientId }),
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

      setLoading(false)
    }

    load()
  }, [clientId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <p className="text-slate-500 dark:text-slate-400">{error ?? 'Client not found.'}</p>
          <Link href="/clients" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back to Clients
          </Link>
        </div>
      </DashboardLayout>
    )
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

        {/* Hero card */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.client_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${contractBadge.color}`}>
                  {contractBadge.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  client.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {client.status.toUpperCase()}
                </span>
              </div>
              {client.contact_person && (
                <p className="text-slate-500 dark:text-slate-400 text-sm">Contact: {client.contact_person}</p>
              )}
            </div>

            {/* Edit action */}
            <Link
              href="/clients"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit Client
            </Link>
          </div>

          {/* Financial stats */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Billing Rate</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {client.billing_rate ? `R${client.billing_rate}/hr` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Sites</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {client.site_count ?? sites.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                R{totalInvoiced.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Outstanding</p>
              <p className={`text-lg font-bold ${outstandingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                R{outstandingAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Contact & Contract details */}
          <div className="space-y-4">
            <Section title="Contact Details" icon={Mail}>
              <div className="space-y-0">
                <InfoRow label="Contact Person" value={client.contact_person} icon={Building2} />
                <InfoRow
                  label="Email"
                  value={client.contact_email ? (
                    <a href={`mailto:${client.contact_email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {client.contact_email}
                    </a>
                  ) : null}
                  icon={Mail}
                />
                <InfoRow label="Phone" value={client.contact_phone} icon={Phone} />
                <InfoRow label="Address" value={client.address} icon={MapPin} />
              </div>
            </Section>

            <Section title="Contract" icon={CalendarClock}>
              <div className="space-y-0">
                <InfoRow label="Start Date" value={fmtDate(client.contract_start_date)} icon={CalendarClock} />
                <InfoRow label="End Date" value={fmtDate(client.contract_end_date)} icon={CalendarClock} />
                <InfoRow label="Billing Rate" value={client.billing_rate ? `R${client.billing_rate}/hr` : null} icon={Banknote} />
              </div>
            </Section>
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
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {site.site_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{site.address || 'No address'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Min staff: {site.min_staff}</span>
                        {site.billing_rate && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">R{site.billing_rate}/hr</span>
                        )}
                        {site.required_skill && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 font-medium">
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
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {inv.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : inv.status === 'overdue' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : inv.status === 'cancelled' ? (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {inv.invoice_number ?? `INV-${inv.invoice_id}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          R{inv.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${s.classes}`}>{s.label}</span>
                      </div>
                    </Link>
                  )
                })}
                <Link
                  href={`/billing/invoices?client_id=${clientId}`}
                  className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 pt-2 border-t border-slate-100 dark:border-slate-700"
                >
                  View all invoices →
                </Link>
              </div>
            )}
          </Section>

        </div>

        {/* Restricted Guards */}
        {restrictions.length > 0 && (
          <Section title={`Restricted Guards (${restrictions.length})`} icon={Ban}>
            <div className="space-y-2">
              {restrictions.map((r) => (
                <div
                  key={r.restriction_id}
                  className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <Ban className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/employees/${r.employee_id}`}
                        className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        {r.employee_name}
                      </Link>
                      {r.reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRestriction(r.restriction_id)}
                    className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
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
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Client Notes</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{client.notes}</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
