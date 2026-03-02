'use client'

import { useEffect, useState } from 'react'
import { Users, Building2, MapPin, Clock, Search, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { employeesApi, clientsApi, sitesApi, shiftPatternsApi } from '@/services/api'
import { Employee, Client, Site } from '@/types'

interface ShiftPatternTemplate {
  id: number
  name: string
  description?: string
  pattern_type: string
  days_on: number
  nights_on: number
  rest_after_days: number
  rest_after_nights: number
  shift_duration_hours: number
}

type ActiveTab = 'clients' | 'sites' | 'pattern'

export default function GuardSetupPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [patterns, setPatterns] = useState<ShiftPatternTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)

  // Selection state
  const [selectedGuards, setSelectedGuards] = useState<Set<number>>(new Set())
  const [guardSearch, setGuardSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('clients')

  // Assignment state
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set())
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<number>>(new Set())
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(null)
  const [rotationGroup, setRotationGroup] = useState('A')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [empRes, clientRes, siteRes, patternRes] = await Promise.allSettled([
        employeesApi.getAll({ status: 'active', limit: 500 }),
        clientsApi.getAll(),
        sitesApi.getAll(),
        shiftPatternsApi.getTemplates(),
      ])

      if (empRes.status === 'fulfilled') {
        const data = empRes.value.data
        setEmployees(Array.isArray(data) ? data : data?.employees ?? [])
      }
      if (clientRes.status === 'fulfilled') {
        setClients(Array.isArray(clientRes.value.data) ? clientRes.value.data : [])
      }
      if (siteRes.status === 'fulfilled') {
        setSites(Array.isArray(siteRes.value.data) ? siteRes.value.data : [])
      }
      if (patternRes.status === 'fulfilled') {
        const data = patternRes.value.data
        setPatterns(Array.isArray(data) ? data : data?.templates ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredGuards = guardSearch
    ? employees.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(guardSearch.toLowerCase())
      )
    : employees

  const toggleGuard = (id: number) => {
    setSelectedGuards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedGuards(new Set(filteredGuards.map((e) => e.employee_id)))
  }

  const clearSelection = () => {
    setSelectedGuards(new Set())
  }

  const toggleClient = (id: number) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSite = (id: number) => {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApply = async () => {
    if (selectedGuards.size === 0) return
    setApplying(true)
    setApplyResult(null)

    let successCount = 0
    let errorCount = 0

    for (const empId of selectedGuards) {
      try {
        const emp = employees.find((e) => e.employee_id === empId)
        if (!emp) continue

        const updates: any = {}

        // Client assignments
        if (selectedClientIds.size > 0) {
          const current = emp.assigned_client_ids || []
          const merged = [...new Set([...current, ...selectedClientIds])]
          updates.assigned_client_ids = merged
        }

        // Site preferences
        if (selectedSiteIds.size > 0) {
          const current = (emp as any).preferred_site_ids || []
          const merged = [...new Set([...current, ...selectedSiteIds])]
          updates.preferred_site_ids = merged
        }

        // Update employee if there are client/site changes
        if (Object.keys(updates).length > 0) {
          await employeesApi.update(empId, updates)
        }

        // Assign shift pattern if selected
        if (selectedPatternId) {
          const today = new Date()
          const threeMonths = new Date(today)
          threeMonths.setMonth(threeMonths.getMonth() + 3)

          await shiftPatternsApi.assignToEmployee(empId, {
            pattern_id: selectedPatternId,
            rotation_group: rotationGroup,
            pattern_start_date: today.toISOString().split('T')[0],
            generate_until: threeMonths.toISOString().split('T')[0],
          }).catch(() => {
            // Pattern assignment is best-effort
          })
        }

        successCount++
      } catch (err) {
        errorCount++
        console.error(`Failed to update employee ${empId}:`, err)
      }
    }

    setApplyResult(
      errorCount === 0
        ? `Updated ${successCount} guard${successCount !== 1 ? 's' : ''} successfully`
        : `Updated ${successCount}, failed ${errorCount}`
    )

    // Refresh employees
    try {
      const res = await employeesApi.getAll({ status: 'active', limit: 500 })
      const data = res.data
      setEmployees(Array.isArray(data) ? data : data?.employees ?? [])
    } catch {}

    setApplying(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Guard Setup</h1>
          <p className="text-gray-500 text-sm mt-1">
            Bulk-assign guards to clients, preferred sites, and shift patterns
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Guard list (2/5) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                  placeholder="Search guards..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {selectedGuards.size} of {employees.length} selected
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAllVisible} className="text-xs text-blue-600 hover:text-blue-800">
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={clearSelection} className="text-xs text-blue-600 hover:text-blue-800">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredGuards.map((emp) => {
                const isSelected = selectedGuards.has(emp.employee_id)
                const clientCount = emp.assigned_client_ids?.length || 0
                const siteCount = (emp as any).preferred_site_ids?.length || 0
                return (
                  <label
                    key={emp.employee_id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGuard(emp.employee_id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <div className="flex gap-2 mt-0.5">
                        {clientCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">
                            {clientCount} client{clientCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {siteCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">
                            {siteCount} site{siteCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{emp.role}</span>
                      </div>
                    </div>
                  </label>
                )
              })}
              {filteredGuards.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  No guards found
                </div>
              )}
            </div>
          </div>

          {/* Right: Assignment panel (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {(['clients', 'sites', 'pattern'] as ActiveTab[]).map((tab) => {
                  const icons = { clients: Building2, sites: MapPin, pattern: Clock }
                  const labels = { clients: 'Clients', sites: 'Preferred Sites', pattern: 'Shift Pattern' }
                  const Icon = icons[tab]
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {labels[tab]}
                      {tab === 'clients' && selectedClientIds.size > 0 && (
                        <span className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5 font-semibold">{selectedClientIds.size}</span>
                      )}
                      {tab === 'sites' && selectedSiteIds.size > 0 && (
                        <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs rounded-full px-1.5 py-0.5 font-semibold">{selectedSiteIds.size}</span>
                      )}
                      {tab === 'pattern' && selectedPatternId && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="p-5">
                {/* Clients Tab */}
                {activeTab === 'clients' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Select clients to assign guards to:</p>
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {clients.map((client) => (
                        <label
                          key={client.client_id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedClientIds.has(client.client_id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(client.client_id)}
                            onChange={() => toggleClient(client.client_id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-800 font-medium">{client.client_name}</span>
                        </label>
                      ))}
                      {clients.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">No clients found</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sites Tab */}
                {activeTab === 'sites' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Select preferred deployment sites:</p>
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {sites.map((site: any) => (
                        <label
                          key={site.site_id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedSiteIds.has(site.site_id) ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSiteIds.has(site.site_id)}
                            onChange={() => toggleSite(site.site_id)}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm text-gray-800 font-medium">{site.site_name}</span>
                            {site.client_name && (
                              <span className="text-xs text-gray-400 ml-2">{site.client_name}</span>
                            )}
                          </div>
                        </label>
                      ))}
                      {sites.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">No sites found</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Pattern Tab */}
                {activeTab === 'pattern' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Select a shift pattern template:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {patterns.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedPatternId === p.id ? 'bg-violet-50 border border-violet-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pattern"
                            checked={selectedPatternId === p.id}
                            onChange={() => setSelectedPatternId(p.id)}
                            className="mt-0.5 w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {p.days_on}D/{p.nights_on}N — {p.rest_after_days} rest — {p.shift_duration_hours}hr shifts
                            </p>
                            {p.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                      {patterns.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">
                          No shift pattern templates found. Create one in Settings first.
                        </p>
                      )}
                    </div>

                    {selectedPatternId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rotation Group
                        </label>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map((g) => (
                            <button
                              key={g}
                              onClick={() => setRotationGroup(g)}
                              className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                                rotationGroup === g
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Guards in different groups start their rotation on offset days
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Apply Button */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Apply to {selectedGuards.size} guard{selectedGuards.size !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedClientIds.size > 0 && `${selectedClientIds.size} client${selectedClientIds.size !== 1 ? 's' : ''}`}
                    {selectedClientIds.size > 0 && selectedSiteIds.size > 0 && ' + '}
                    {selectedSiteIds.size > 0 && `${selectedSiteIds.size} site${selectedSiteIds.size !== 1 ? 's' : ''}`}
                    {(selectedClientIds.size > 0 || selectedSiteIds.size > 0) && selectedPatternId && ' + '}
                    {selectedPatternId && `pattern (Group ${rotationGroup})`}
                    {selectedClientIds.size === 0 && selectedSiteIds.size === 0 && !selectedPatternId && 'No assignments selected'}
                  </p>
                </div>
              </div>

              {applyResult && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  applyResult.includes('failed')
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {applyResult}
                </div>
              )}

              <button
                onClick={handleApply}
                disabled={applying || selectedGuards.size === 0 || (selectedClientIds.size === 0 && selectedSiteIds.size === 0 && !selectedPatternId)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Apply to Selected Guards
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
