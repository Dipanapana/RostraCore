import * as XLSX from 'xlsx'
import { RosterGenerateResponse } from '@/types'

export function downloadRosterExcel(
  data: RosterGenerateResponse,
  startDate?: Date | null,
  endDate?: Date | null
) {
  if (!data.assignments || data.assignments.length === 0) return

  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const dateRange = startDate && endDate
    ? `${startDate.toLocaleDateString('en-ZA')} – ${endDate.toLocaleDateString('en-ZA')}`
    : 'N/A'
  const summaryData = [
    ['RostraCore Roster Summary'],
    [''],
    ['Metric', 'Value'],
    ['Date Range', dateRange],
    ['Total Shifts', data.summary?.total_shifts || 0],
    ['Shifts Filled', data.summary?.total_shifts_filled || 0],
    ['Fill Rate', `${data.summary?.fill_rate?.toFixed(1) || 0}%`],
    ['Staff Utilized', data.summary?.employees_utilized || 0],
    ['Total Cost', `R ${(data.summary?.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
    ['Avg Cost / Shift', `R ${(data.summary?.average_cost_per_shift || 0).toFixed(2)}`],
    ['Solver Status', data.status || 'N/A'],
    ['Engine', 'Google OR-Tools CP-SAT'],
    ['Generated', new Date().toLocaleString('en-ZA')],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Sheet 2: All Assignments
  const headers = ['Employee', 'Employee ID', 'Site', 'Site ID', 'Client', 'Date', 'Start', 'End', 'Hours', 'Cost (R)']
  const rows = data.assignments.map((a) => {
    const start = a.start_time ? new Date(a.start_time) : null
    const end = a.end_time ? new Date(a.end_time) : null
    const hours = start && end ? ((end.getTime() - start.getTime()) / 3600000).toFixed(1) : ''
    return [
      a.employee_name || `Employee ${a.employee_id}`,
      a.employee_id,
      a.site_name || `Site ${a.site_id}`,
      a.site_id || '',
      a.client_name || '',
      start ? start.toLocaleDateString('en-ZA') : '',
      start ? start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '',
      end ? end.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '',
      hours,
      (a.cost || 0).toFixed(2),
    ]
  })
  const assignWs = XLSX.utils.aoa_to_sheet([headers, ...rows])
  assignWs['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 8 },
    { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, assignWs, 'Assignments')

  // Sheet 3: By Site summary
  const siteMap: Record<string, { count: number; cost: number; employees: Set<number> }> = {}
  data.assignments.forEach((a) => {
    const key = a.site_name || `Site ${a.site_id}`
    if (!siteMap[key]) siteMap[key] = { count: 0, cost: 0, employees: new Set() }
    siteMap[key].count++
    siteMap[key].cost += a.cost || 0
    siteMap[key].employees.add(a.employee_id)
  })
  const siteHeaders = ['Site', 'Shifts', 'Guards Used', 'Total Cost (R)']
  const siteRows = Object.entries(siteMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([site, d]) => [site, d.count, d.employees.size, d.cost.toFixed(2)])
  const siteWs = XLSX.utils.aoa_to_sheet([siteHeaders, ...siteRows])
  siteWs['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, siteWs, 'By Site')

  // Download
  const dateStr = startDate ? startDate.toISOString().split('T')[0] : 'roster'
  XLSX.writeFile(wb, `roster_${dateStr}.xlsx`)
}
