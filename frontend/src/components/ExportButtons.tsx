'use client'

import { useState } from 'react'
import { exportsApi } from '@/services/api'

interface ExportButtonsProps {
  type: 'employees' | 'sites' | 'shifts' | 'certifications' | 'roster'
  filters?: any
  className?: string
}

export default function ExportButtons({ type, filters, className = '' }: ExportButtonsProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    let url = ''
    let filename = ''

    switch (type) {
      case 'employees':
        url = format === 'csv' ? exportsApi.employeesCsv() : exportsApi.employeesExcel()
        filename = `employees_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'xlsx'}`
        break
      case 'sites':
        url = format === 'csv' ? exportsApi.sitesCsv() : exportsApi.sitesExcel()
        filename = `sites_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'xlsx'}`
        break
      case 'shifts':
        url = format === 'csv' ? exportsApi.shiftsCsv(filters) : exportsApi.shiftsExcel(filters)
        filename = `shifts_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'xlsx'}`
        break
      case 'certifications':
        url = format === 'csv' ? exportsApi.certificationsCsv() : exportsApi.certificationsExcel()
        filename = `certifications_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'xlsx'}`
        break
      case 'roster':
        if (format === 'pdf') {
          url = exportsApi.rosterPdf(filters)
          filename = `roster_${new Date().toISOString().slice(0,10)}.pdf`
        } else if (format === 'excel') {
          url = exportsApi.rosterExcel(filters)
          filename = `roster_${new Date().toISOString().slice(0,10)}.xlsx`
        }
        break
    }

    if (url) {
      try {
        setDownloading(format)
        // Get Bearer token from localStorage
        const token = localStorage.getItem('access_token')

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Export failed:', response.status, errorText)
          throw new Error(`Download failed: ${response.status}`)
        }

        // Create blob and download
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } catch (error) {
        console.error('Export error:', error)
        alert('Failed to download. Please try again.')
      } finally {
        setDownloading(null)
      }
    }
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* CSV Export */}
      {type !== 'roster' && (
        <button
          onClick={() => handleExport('csv')}
          disabled={downloading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export to CSV"
        >
          {downloading === 'csv' ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span className="font-medium">CSV</span>
        </button>
      )}

      {/* Excel Export */}
      {type !== 'roster' && (
        <button
          onClick={() => handleExport('excel')}
          disabled={downloading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export to Excel"
        >
          {downloading === 'excel' ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span className="font-medium">Excel</span>
        </button>
      )}

      {/* Roster Export: Both PDF and Excel */}
      {type === 'roster' && (
        <>
          <button
            onClick={() => handleExport('excel')}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Roster to Excel"
          >
            {downloading === 'excel' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="font-medium">Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Roster to PDF"
          >
            {downloading === 'pdf' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            <span className="font-medium">PDF</span>
          </button>
        </>
      )}
    </div>
  )
}
