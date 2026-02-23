'use client'

import { useState, useEffect, useCallback } from 'react'
import { rolePermissionsApi } from '@/services/api'
import PageHeader from '@/components/ui/PageHeader'
import { Shield, RotateCcw, Save, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface PermissionCategory {
  label: string
  permissions: Record<string, string>
}

const ROLE_LABELS: Record<string, string> = {
  scheduler: 'Scheduler',
  finance: 'Finance',
  guard: 'Guard',
  client_viewer: 'Client Viewer',
}

export default function RolePermissionsPage() {
  const [categories, setCategories] = useState<Record<string, PermissionCategory>>({})
  const [allKeys, setAllKeys] = useState<string[]>([])
  const [matrix, setMatrix] = useState<Record<string, string[]>>({})
  const [customisableRoles, setCustomisableRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    try {
      const [keysRes, matrixRes] = await Promise.all([
        rolePermissionsApi.getKeys(),
        rolePermissionsApi.getAll(),
      ])
      setCategories(keysRes.data.categories || {})
      setAllKeys(keysRes.data.all_keys || [])
      setMatrix(matrixRes.data.matrix || {})
      setCustomisableRoles(matrixRes.data.customisable_roles || [])
      // Expand all categories by default
      const expanded: Record<string, boolean> = {}
      Object.keys(keysRes.data.categories || {}).forEach(k => { expanded[k] = true })
      setExpandedCategories(expanded)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const isGranted = (role: string, key: string): boolean => {
    return (matrix[role] || []).includes(key)
  }

  const togglePermission = (role: string, key: string) => {
    setMatrix(prev => {
      const current = prev[role] || []
      const has = current.includes(key)
      return {
        ...prev,
        [role]: has ? current.filter(k => k !== key) : [...current, key],
      }
    })
  }

  const toggleAllInCategory = (role: string, categoryKey: string, grant: boolean) => {
    const catPerms = Object.keys(categories[categoryKey]?.permissions || {})
    setMatrix(prev => {
      const current = new Set(prev[role] || [])
      catPerms.forEach(k => {
        if (grant) current.add(k)
        else current.delete(k)
      })
      return { ...prev, [role]: Array.from(current) }
    })
  }

  const saveRole = async (role: string) => {
    setSaving(role)
    try {
      const perms: Record<string, boolean> = {}
      allKeys.forEach(key => {
        perms[key] = (matrix[role] || []).includes(key)
      })
      await rolePermissionsApi.updateRole(role, perms)
      setSaved(role)
      setTimeout(() => setSaved(null), 2000)
    } catch { /* ignore */ } finally {
      setSaving(null)
    }
  }

  const resetDefaults = async () => {
    if (!confirm('Reset all role permissions to system defaults? This cannot be undone.')) return
    try {
      setLoading(true)
      await rolePermissionsApi.resetDefaults()
      await fetchData()
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) return <div className="p-8 text-gray-500">Loading permissions...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        backHref="/settings"
        backLabel="Back to Settings"
        title="Role Permissions"
        subtitle="Configure which features each role can access"
        icon={<Shield className="text-blue-600" size={28} />}
        actions={
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw size={14} /> Reset to Defaults
          </button>
        }
      />

      {/* Role Tabs + Save Buttons */}
      <div className="flex flex-wrap gap-3">
        {customisableRoles.map(role => (
          <button
            key={role}
            onClick={() => saveRole(role)}
            disabled={saving === role}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              saved === role
                ? 'border-green-300 bg-green-50 text-green-700'
                : saving === role
                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-wait'
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {saved === role ? <Check size={14} /> : <Save size={14} />}
            Save {ROLE_LABELS[role] || role}
          </button>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: `280px repeat(${customisableRoles.length}, 1fr)` }}>
          <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Permission
          </div>
          {customisableRoles.map(role => (
            <div key={role} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
              {ROLE_LABELS[role] || role}
            </div>
          ))}
        </div>

        {/* Categories */}
        {Object.entries(categories).map(([catKey, cat]) => {
          const isExpanded = expandedCategories[catKey] !== false
          const permEntries = Object.entries(cat.permissions)

          return (
            <div key={catKey}>
              {/* Category header */}
              <div
                className="grid border-b border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
                style={{ gridTemplateColumns: `280px repeat(${customisableRoles.length}, 1fr)` }}
                onClick={() => toggleCategory(catKey)}
              >
                <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {cat.label}
                  <span className="text-xs font-normal text-gray-400">({permEntries.length})</span>
                </div>
                {customisableRoles.map(role => {
                  const granted = permEntries.filter(([k]) => isGranted(role, k)).length
                  const total = permEntries.length
                  const allGranted = granted === total
                  return (
                    <div key={role} className="px-4 py-2.5 flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAllInCategory(role, catKey, !allGranted)
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          allGranted
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : granted > 0
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {granted}/{total}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Permission rows */}
              {isExpanded && permEntries.map(([permKey, permLabel]) => (
                <div
                  key={permKey}
                  className="grid border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  style={{ gridTemplateColumns: `280px repeat(${customisableRoles.length}, 1fr)` }}
                >
                  <div className="px-4 py-2 pl-10">
                    <div className="text-sm text-gray-700">{permLabel}</div>
                    <div className="text-xs text-gray-400 font-mono">{permKey}</div>
                  </div>
                  {customisableRoles.map(role => (
                    <div key={role} className="px-4 py-2 flex items-center justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isGranted(role, permKey)}
                          onChange={() => togglePermission(role, permKey)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Info text */}
      <div className="text-xs text-gray-400 text-center">
        Admin, Company Admin, and Superadmin roles always have full access and cannot be customised.
      </div>
    </div>
  )
}
