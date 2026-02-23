'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientSatisfactionApi, clientsApi } from '@/services/api'
import { Star, TrendingUp, TrendingDown, AlertTriangle, Plus, X } from 'lucide-react'

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) return <span className="text-gray-400">—</span>
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= full ? 'fill-yellow-400 text-yellow-400' : half && i === full + 1 ? 'fill-yellow-200 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

type TabType = 'dashboard' | 'surveys'

export default function ClientSatisfactionPage() {
  const [tab, setTab] = useState<TabType>('dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [surveys, setSurveys] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<any>({
    client_id: '', overall_rating: 4, service_quality: 4, response_time: 4,
    professionalism: 4, communication: 4, feedback: '', areas_of_improvement: '',
    survey_period: '', respondent_name: '', respondent_role: '',
  })

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await clientSatisfactionApi.dashboard()
      setDashboard(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await clientSatisfactionApi.list()
      setSurveys(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientsApi.list()
      setClients(Array.isArray(res.data) ? res.data : res.data.clients || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      tab === 'dashboard' ? fetchDashboard() : fetchSurveys(),
      fetchClients(),
    ]).finally(() => setLoading(false))
  }, [tab, fetchDashboard, fetchSurveys, fetchClients])

  const handleCreate = async () => {
    if (!form.client_id) return
    try {
      await clientSatisfactionApi.create({
        ...form,
        client_id: Number(form.client_id),
        survey_period: form.survey_period || undefined,
      })
      setShowCreate(false)
      setForm({ client_id: '', overall_rating: 4, service_quality: 4, response_time: 4, professionalism: 4, communication: 4, feedback: '', areas_of_improvement: '', survey_period: '', respondent_name: '', respondent_role: '' })
      if (tab === 'dashboard') fetchDashboard()
      else fetchSurveys()
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="w-7 h-7 text-yellow-500" />
          <h1 className="text-2xl font-semibold text-gray-900">Client Satisfaction</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTab('dashboard')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'dashboard' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Dashboard</button>
            <button onClick={() => setTab('surveys')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'surveys' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Surveys</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700">
            <Plus className="w-4 h-4" />New Survey
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}

      {/* Dashboard Tab */}
      {!loading && tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total Surveys</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.total_surveys}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Overall Avg</div>
              <StarRating rating={dashboard.avg_overall} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Service Quality</div>
              <StarRating rating={dashboard.avg_service_quality} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Response Time</div>
              <StarRating rating={dashboard.avg_response_time} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Professionalism</div>
              <StarRating rating={dashboard.avg_professionalism} />
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Communication</div>
              <StarRating rating={dashboard.avg_communication} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Client */}
            {dashboard.by_client.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4">By Client</h2>
                <div className="space-y-3">
                  {dashboard.by_client.map((c: any) => (
                    <div key={c.client_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{c.client_name}</div>
                        <div className="text-xs text-gray-500">{c.surveys} survey{c.surveys !== 1 ? 's' : ''}</div>
                      </div>
                      <StarRating rating={c.avg_overall} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend */}
            {dashboard.trend.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Trend</h2>
                <div className="space-y-2">
                  {dashboard.trend.map((t: any, i: number) => {
                    const prev = i > 0 ? dashboard.trend[i - 1].avg_rating : null
                    const trending = prev ? (t.avg_rating > prev ? 'up' : t.avg_rating < prev ? 'down' : 'flat') : 'flat'
                    return (
                      <div key={t.period} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{t.period}</span>
                          {trending === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {trending === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{t.surveys} surveys</span>
                          <StarRating rating={t.avg_rating} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Low Rated */}
          {dashboard.low_rated.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />Low-Rated Surveys (Below 3.0)
              </h2>
              <div className="space-y-2">
                {dashboard.low_rated.map((s: any) => (
                  <div key={s.survey_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.client_name}</div>
                      <div className="text-xs text-gray-500">{s.survey_period || s.created_at?.split('T')[0]}</div>
                    </div>
                    <StarRating rating={s.overall_rating} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {dashboard.total_surveys === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No satisfaction surveys recorded yet.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-yellow-600 text-sm font-medium hover:underline">Record your first survey</button>
            </div>
          )}
        </div>
      )}

      {/* Surveys Tab */}
      {!loading && tab === 'surveys' && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          {surveys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No surveys yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="p-3">Client</th>
                  <th className="p-3">Site</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Overall</th>
                  <th className="p-3">Respondent</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((s: any) => (
                  <tr key={s.survey_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{s.client_name || `Client #${s.client_id}`}</td>
                    <td className="p-3 text-gray-500">{s.site_name || '—'}</td>
                    <td className="p-3 text-gray-500">{s.survey_period || '—'}</td>
                    <td className="p-3"><StarRating rating={s.overall_rating} /></td>
                    <td className="p-3 text-gray-500">{s.respondent_name || '—'}</td>
                    <td className="p-3 text-gray-500">{s.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Satisfaction Survey</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select client...</option>
                  {clients.map((c: any) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
              {['overall_rating', 'service_quality', 'response_time', 'professionalism', 'communication'].map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field.replace('_', ' ')} (1-5)</label>
                  <input type="number" min={1} max={5} step={0.5} value={form[field]} onChange={e => setForm({ ...form, [field]: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Survey Period</label>
                <input type="text" placeholder="e.g. 2026-01" value={form.survey_period} onChange={e => setForm({ ...form, survey_period: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Respondent Name</label>
                <input type="text" value={form.respondent_name} onChange={e => setForm({ ...form, respondent_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea rows={3} value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Areas of Improvement</label>
                <textarea rows={2} value={form.areas_of_improvement} onChange={e => setForm({ ...form, areas_of_improvement: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">Save Survey</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
