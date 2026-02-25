'use client'

import { useState } from 'react'
import GuardCard from './GuardCard'

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  role: string
  psira_grade?: string
  hourly_rate?: number
}

interface AvailableGuardsPanelProps {
  employees: Employee[]
  assignedIds: Set<number>
}

export default function AvailableGuardsPanel({ employees, assignedIds }: AvailableGuardsPanelProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const unassigned = employees.filter((e) => !assignedIds.has(e.employee_id))

  const filtered = unassigned.filter((e) => {
    const matchesSearch =
      search === '' ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || e.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roles = Array.from(new Set(employees.map((e) => e.role)))

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Available Guards ({filtered.length})
        </h3>
        <input
          type="text"
          placeholder="Search guards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full mt-2 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map((emp) => (
          <GuardCard key={emp.employee_id} employee={emp} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No available guards</p>
        )}
      </div>
    </div>
  )
}
