'use client'

import { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from '@/lib/config'

interface VersionSummary {
  snapshot_id: number
  version: number
  label: string | null
  created_at: string | null
  created_by: number | null
  assignment_count: number
  total_shifts: number
  assigned_shifts: number
  total_cost: number | null
}

interface DiffAssignment {
  assignment_id: number
  shift_id: number
  employee_id: number
  employee_name?: string
  site_name?: string
  shift_start?: string
  shift_end?: string
  status: string
  regular_hours: number
  cost?: number
}

interface CompareResult {
  roster_id: number
  v1: number
  v2: number
  v1_label: string | null
  v2_label: string | null
  v1_created_at: string | null
  v2_created_at: string | null
  added: DiffAssignment[]
  removed: DiffAssignment[]
  changed: { v1: DiffAssignment; v2: DiffAssignment }[]
  summary: {
    added_count: number
    removed_count: number
    changed_count: number
    v1_total_cost: number | null
    v2_total_cost: number | null
  }
}

interface VersionHistoryProps {
  rosterId: number
  rosterStatus: string
  onRollback?: () => void
}

export default function VersionHistory({ rosterId, rosterStatus, onRollback }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [comparing, setComparing] = useState(false)
  const [selectedV1, setSelectedV1] = useState<number | null>(null)
  const [selectedV2, setSelectedV2] = useState<number | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [rollbackConfirm, setRollbackConfirm] = useState<number | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/versions`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error('Failed to load versions')
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Failed to load versions:', err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  const handleCompare = async () => {
    if (selectedV1 === null || selectedV2 === null) return
    setComparing(true)
    setCompareResult(null)

    try {
      const res = await fetch(
        `${getApiUrl()}/api/v1/roster/saved/${rosterId}/compare?v1=${selectedV1}&v2=${selectedV2}`,
        { headers: authHeaders }
      )
      if (!res.ok) throw new Error('Comparison failed')
      const data: CompareResult = await res.json()
      setCompareResult(data)
    } catch (err) {
      console.error('Compare failed:', err)
    } finally {
      setComparing(false)
    }
  }

  const handleRollback = async (snapshotId: number) => {
    setRollingBack(true)
    try {
      const res = await fetch(
        `${getApiUrl()}/api/v1/roster/saved/${rosterId}/rollback/${snapshotId}`,
        { method: 'POST', headers: authHeaders }
      )
      if (!res.ok) throw new Error('Rollback failed')
      setRollbackConfirm(null)
      await loadVersions()
      onRollback?.()
    } catch (err) {
      console.error('Rollback failed:', err)
    } finally {
      setRollingBack(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShiftTime = (iso: string | undefined) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const labelColor = (label: string | null) => {
    if (!label) return 'bg-gray-100 text-gray-600'
    if (label.includes('Rollback')) return 'bg-orange-100 text-orange-700'
    if (label === 'Published') return 'bg-green-100 text-green-700'
    if (label === 'Initial save') return 'bg-blue-100 text-blue-700'
    if (label.includes('assignment') || label.includes('Unassignment')) return 'bg-purple-100 text-purple-700'
    if (label === 'Swap') return 'bg-indigo-100 text-indigo-700'
    return 'bg-gray-100 text-gray-600'
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
        Loading version history...
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        No version history yet. Snapshots are created when you save, publish, or modify assignments.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Version timeline */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Version History ({versions.length} snapshots)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select two versions to compare, or rollback to a previous version
          </p>
        </div>

        {/* Compare controls */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="text-xs text-gray-500">Compare:</span>
          <select
            value={selectedV1 ?? ''}
            onChange={(e) => setSelectedV1(e.target.value ? parseInt(e.target.value) : null)}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
          >
            <option value="">v1...</option>
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version} — {v.label || 'Snapshot'}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400">vs</span>
          <select
            value={selectedV2 ?? ''}
            onChange={(e) => setSelectedV2(e.target.value ? parseInt(e.target.value) : null)}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
          >
            <option value="">v2...</option>
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version} — {v.label || 'Snapshot'}
              </option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={selectedV1 === null || selectedV2 === null || selectedV1 === selectedV2 || comparing}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {comparing ? 'Comparing...' : 'Compare'}
          </button>
        </div>

        {/* Timeline */}
        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
          {versions.map((v, index) => (
            <div
              key={v.snapshot_id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              {/* Timeline dot */}
              <div className="flex-shrink-0 relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
                {index < versions.length - 1 && (
                  <div className="absolute top-3 left-1.5 w-px h-6 -translate-x-px bg-gray-200" />
                )}
              </div>

              {/* Version info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">v{v.version}</span>
                  {v.label && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColor(
                        v.label
                      )}`}
                    >
                      {v.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                  <span>{formatDate(v.created_at)}</span>
                  <span>{v.assignment_count} assignments</span>
                  <span>
                    {v.assigned_shifts}/{v.total_shifts} shifts filled
                  </span>
                  {v.total_cost != null && (
                    <span>R{v.total_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {rosterStatus === 'draft' && index > 0 && (
                  <>
                    {rollbackConfirm === v.snapshot_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-red-600">Rollback?</span>
                        <button
                          onClick={() => handleRollback(v.snapshot_id)}
                          disabled={rollingBack}
                          className="px-2 py-0.5 text-[10px] bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {rollingBack ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setRollbackConfirm(null)}
                          className="px-2 py-0.5 text-[10px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRollbackConfirm(v.snapshot_id)}
                        className="px-2 py-1 text-[10px] text-orange-600 border border-orange-300 rounded hover:bg-orange-50"
                      >
                        Rollback
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison result */}
      {compareResult && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Comparing v{compareResult.v1} → v{compareResult.v2}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>
                v{compareResult.v1}: {compareResult.v1_label || 'Snapshot'} ({formatDate(compareResult.v1_created_at)})
              </span>
              <span>→</span>
              <span>
                v{compareResult.v2}: {compareResult.v2_label || 'Snapshot'} ({formatDate(compareResult.v2_created_at)})
              </span>
            </div>
          </div>

          {/* Summary badges */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
            {compareResult.summary.added_count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                +{compareResult.summary.added_count} added
              </span>
            )}
            {compareResult.summary.removed_count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                -{compareResult.summary.removed_count} removed
              </span>
            )}
            {compareResult.summary.changed_count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                ~{compareResult.summary.changed_count} changed
              </span>
            )}
            {compareResult.summary.added_count === 0 &&
              compareResult.summary.removed_count === 0 &&
              compareResult.summary.changed_count === 0 && (
                <span className="text-xs text-gray-500">No differences found</span>
              )}
            {(compareResult.summary.v1_total_cost != null || compareResult.summary.v2_total_cost != null) && (
              <span className="ml-auto text-xs text-gray-500">
                Cost: R{(compareResult.summary.v1_total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                {' → '}
                R{(compareResult.summary.v2_total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Diff details */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {/* Added assignments */}
            {compareResult.added.map((a, i) => (
              <div key={`add-${i}`} className="px-4 py-2 flex items-center gap-3 bg-green-50/50">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                  +
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">
                    {a.employee_name || `Employee #${a.employee_id}`}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    → {a.site_name || `Shift #${a.shift_id}`}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatShiftTime(a.shift_start)}
                  {a.cost != null && <span className="ml-2">R{a.cost.toFixed(2)}</span>}
                </div>
              </div>
            ))}

            {/* Removed assignments */}
            {compareResult.removed.map((a, i) => (
              <div key={`rem-${i}`} className="px-4 py-2 flex items-center gap-3 bg-red-50/50">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  -
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 line-through">
                    {a.employee_name || `Employee #${a.employee_id}`}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    → {a.site_name || `Shift #${a.shift_id}`}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatShiftTime(a.shift_start)}
                  {a.cost != null && <span className="ml-2">R{a.cost.toFixed(2)}</span>}
                </div>
              </div>
            ))}

            {/* Changed assignments */}
            {compareResult.changed.map((c, i) => (
              <div key={`chg-${i}`} className="px-4 py-2 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                    ~
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      {c.v2.employee_name || `Employee #${c.v2.employee_id}`}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      @ {c.v2.site_name || `Shift #${c.v2.shift_id}`}
                    </span>
                  </div>
                </div>
                <div className="ml-8 mt-1 flex items-center gap-4 text-[11px]">
                  {c.v1.status !== c.v2.status && (
                    <span>
                      Status: <span className="text-red-600">{c.v1.status}</span> →{' '}
                      <span className="text-green-600">{c.v2.status}</span>
                    </span>
                  )}
                  {c.v1.regular_hours !== c.v2.regular_hours && (
                    <span>
                      Hours: <span className="text-red-600">{c.v1.regular_hours}h</span> →{' '}
                      <span className="text-green-600">{c.v2.regular_hours}h</span>
                    </span>
                  )}
                  {c.v1.cost !== c.v2.cost && c.v1.cost != null && c.v2.cost != null && (
                    <span>
                      Cost: <span className="text-red-600">R{c.v1.cost.toFixed(2)}</span> →{' '}
                      <span className="text-green-600">R{c.v2.cost.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
