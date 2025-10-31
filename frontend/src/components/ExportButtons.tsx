'use client'

import { exportsApi } from '@/services/api'

interface ExportButtonsProps {
  type: 'employees' | 'sites' | 'shifts' | 'certifications' | 'roster'
  filters?: any
  className?: string
}

export default function ExportButtons({ type, filters, className = '' }: ExportButtonsProps) {
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    let url = ''

    switch (type) {
      case 'employees':
        url = format === 'csv' ? exportsApi.employeesCsv() : exportsApi.employeesExcel()
        break
      case 'sites':
        url = format === 'csv' ? exportsApi.sitesCsv() : exportsApi.sitesExcel()
        break
      case 'shifts':
        url = format === 'csv' ? exportsApi.shiftsCsv(filters) : exportsApi.shiftsExcel(filters)
        break
      case 'certifications':
        url = format === 'csv' ? exportsApi.certificationsCsv() : exportsApi.certificationsExcel()
        break
      case 'roster':
        if (format === 'pdf') {
          url = exportsApi.rosterPdf(filters)
        }
        break
    }

    if (url) {
      // Open URL in new tab to trigger download
      window.open(url, '_blank')
    }
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* CSV Export */}
      {type !== 'roster' && (
        <button
          onClick={() => handleExport('csv')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
          title="Export to CSV"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">CSV</span>
        </button>
      )}

      {/* Excel Export */}
      {type !== 'roster' && (
        <button
          onClick={() => handleExport('excel')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
          title="Export to Excel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">Excel</span>
        </button>
      )}

      {/* PDF Export (Roster only) */}
      {type === 'roster' && (
        <button
          onClick={() => handleExport('pdf')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
          title="Export Roster to PDF"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">PDF Report</span>
        </button>
      )}
    </div>
  )
}
