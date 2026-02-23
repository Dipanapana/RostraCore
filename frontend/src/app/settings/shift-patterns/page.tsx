'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import {
  Clock,
  Plus,
  Settings2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Moon,
  Sun,
  RefreshCw,
  Trash2,
  Edit2,
  Copy,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import api from '@/services/api'

interface ShiftPatternTemplate {
  template_id: number
  org_id: number
  name: string
  description: string | null
  pattern_type: string
  shift_duration_hours: number
  days_on: number
  nights_on: number
  rest_after_days: number
  rest_after_nights: number
  day_shift_start: string
  day_shift_end: string
  night_shift_start: string
  night_shift_end: string
  max_consecutive_days: number
  max_consecutive_nights: number
  min_rest_between_shifts: number
  max_hours_per_week: number
  max_hours_per_month: number | null
  include_meal_break: boolean
  meal_break_duration_minutes: number
  is_default: boolean
  is_active: boolean
  cycle_length_days: number
  working_days_per_cycle: number
  hours_per_cycle: number
  average_hours_per_week: number
  is_bcea_compliant: boolean
  bcea_violations: string[]
}

interface GuardCalculation {
  guards_needed: number
  posts: number
  pattern_name: string
  cycle_length_days: number
  working_days_per_cycle: number
  hours_per_guard_per_cycle: number
  average_hours_per_week: number
  shift_duration: number
  explanation: string
}

export default function ShiftPatternsPage() {
  const [templates, setTemplates] = useState<ShiftPatternTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftPatternTemplate | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedSuccess, setSeedSuccess] = useState(false)
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set())
  const [guardCalc, setGuardCalc] = useState<GuardCalculation | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcPosts, setCalcPosts] = useState(1)
  const [selectedTemplateForCalc, setSelectedTemplateForCalc] = useState<number | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/shift-patterns/templates?active_only=false')
      setTemplates(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shift patterns')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedPatterns = async () => {
    try {
      setSeeding(true)
      setSeedSuccess(false)
      await api.post('/api/v1/shift-patterns/templates/seed')
      await fetchTemplates()
      setSeedSuccess(true)
      setTimeout(() => setSeedSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to seed common patterns')
    } finally {
      setSeeding(false)
    }
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return

    try {
      await api.delete(`/api/v1/shift-patterns/templates/${templateId}`)
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete pattern')
    }
  }

  const handleToggleActive = async (template: ShiftPatternTemplate) => {
    try {
      await api.patch(`/api/v1/shift-patterns/templates/${template.template_id}`, {
        is_active: !template.is_active
      })
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update pattern')
    }
  }

  const handleSetDefault = async (templateId: number) => {
    try {
      await api.patch(`/api/v1/shift-patterns/templates/${templateId}`, {
        is_default: true
      })
      await fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set default pattern')
    }
  }

  const toggleExpanded = (templateId: number) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
  }

  const calculateGuards = async (templateId: number) => {
    try {
      setCalcLoading(true)
      setSelectedTemplateForCalc(templateId)
      const response = await api.post('/api/v1/shift-patterns/calculate-guards', {
        template_id: templateId,
        num_posts: calcPosts
      })
      setGuardCalc(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate guards')
    } finally {
      setCalcLoading(false)
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--'
    return timeStr.substring(0, 5)
  }

  const getPatternTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '4_on_4_off': '4-on-4-off',
      '2_2_3': '2-2-3 Continental',
      '6_on_3_off': '6-on-3-off',
      '5_on_2_off': '5-on-2-off (Mon-Fri)',
      'custom': 'Custom'
    }
    return labels[type] || type
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Shift Pattern Templates
            </h1>
            <p className="text-gray-600 mt-1">
              Manage rotation patterns for guard scheduling (4-on-4-off, 2-2-3, etc.)
            </p>
          </div>
          <div className="flex gap-3">
            {templates.length === 0 && (
              <button
                onClick={handleSeedPatterns}
                disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {seeding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Seed Common Patterns
              </button>
            )}
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Pattern
            </button>
          </div>
        </div>

        {/* Success message */}
        {seedSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Common shift patterns have been added successfully!
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : templates.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shift Patterns Yet</h3>
            <p className="text-gray-600 mb-4">
              Get started with common SA security industry patterns or create your own.
            </p>
            <button
              onClick={handleSeedPatterns}
              disabled={seeding}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Adding Patterns...' : 'Add Common Patterns'}
            </button>
          </div>
        ) : (
          /* Templates grid */
          <div className="grid gap-4">
            {templates.map((template) => (
              <div
                key={template.template_id}
                className={`bg-white rounded-xl shadow-sm border ${
                  template.is_default
                    ? 'border-amber-400 ring-2 ring-amber-200'
                    : 'border-gray-200'
                } ${!template.is_active ? 'opacity-60' : ''}`}
              >
                {/* Template header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(template.template_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        template.pattern_type === '4_on_4_off' ? 'bg-blue-100 text-blue-600' :
                        template.pattern_type === '2_2_3' ? 'bg-purple-100 text-purple-600' :
                        template.pattern_type === '6_on_3_off' ? 'bg-emerald-50 text-green-600' :
                        template.pattern_type === '5_on_2_off' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                              Default
                            </span>
                          )}
                          {!template.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Inactive
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getPatternTypeLabel(template.pattern_type)} • {template.shift_duration_hours}h shifts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* BCEA Compliance badge */}
                      {template.is_bcea_compliant ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          BCEA Compliant
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          {template.bcea_violations.length} violation(s)
                        </div>
                      )}

                      {/* Quick stats */}
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Sun className="w-4 h-4 text-amber-500" />
                          {template.days_on}d on
                        </span>
                        <span className="flex items-center gap-1">
                          <Moon className="w-4 h-4 text-indigo-500" />
                          {template.nights_on}n on
                        </span>
                        <span>{template.cycle_length_days}-day cycle</span>
                      </div>

                      {expandedTemplates.has(template.template_id) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedTemplates.has(template.template_id) && (
                  <div className="border-t p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* Shift timing */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Day Shift
                        </h4>
                        <p className="font-semibold text-gray-900">
                          {formatTime(template.day_shift_start)} - {formatTime(template.day_shift_end)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Moon className="w-3 h-3" /> Night Shift
                        </h4>
                        <p className="font-semibold text-gray-900">
                          {formatTime(template.night_shift_start)} - {formatTime(template.night_shift_end)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Avg Hours/Week</h4>
                        <p className="font-semibold text-gray-900">
                          {template.average_hours_per_week.toFixed(1)}h
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Working Days</h4>
                        <p className="font-semibold text-gray-900">
                          {template.working_days_per_cycle} / {template.cycle_length_days} days
                        </p>
                      </div>
                    </div>

                    {/* BCEA Compliance Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Max consecutive days:</span>
                        <span className="ml-2 font-medium text-gray-900">{template.max_consecutive_days}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Max consecutive nights:</span>
                        <span className="ml-2 font-medium text-gray-900">{template.max_consecutive_nights}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Min rest between shifts:</span>
                        <span className="ml-2 font-medium text-gray-900">{template.min_rest_between_shifts}h</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Meal break:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {template.include_meal_break ? `${template.meal_break_duration_minutes} min` : 'No'}
                        </span>
                      </div>
                    </div>

                    {/* BCEA Violations */}
                    {!template.is_bcea_compliant && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <h4 className="font-medium text-amber-700 mb-1">BCEA Compliance Issues:</h4>
                        <ul className="text-sm text-amber-600 list-disc list-inside">
                          {template.bcea_violations.map((v, i) => (
                            <li key={i}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Guard Calculator */}
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Guard Calculator
                      </h4>
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="text-sm text-blue-600">Number of posts:</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={calcPosts}
                            onChange={(e) => setCalcPosts(parseInt(e.target.value) || 1)}
                            className="ml-2 w-16 px-2 py-1 border rounded"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            calculateGuards(template.template_id)
                          }}
                          disabled={calcLoading && selectedTemplateForCalc === template.template_id}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {calcLoading && selectedTemplateForCalc === template.template_id ? 'Calculating...' : 'Calculate'}
                        </button>
                      </div>
                      {guardCalc && selectedTemplateForCalc === template.template_id && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="font-semibold text-gray-900">
                            You need <span className="text-blue-600">{guardCalc.guards_needed} guards</span> for 24/7 coverage
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {guardCalc.explanation}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t pt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTemplate(template)
                          setShowModal(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(template)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        {template.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {!template.is_default && template.is_active && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetDefault(template.template_id)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(template.template_id)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
