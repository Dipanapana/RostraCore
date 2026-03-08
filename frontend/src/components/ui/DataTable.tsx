'use client'

import React, { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'

export interface Column<T> {
    header: string
    accessorKey?: keyof T
    cell?: (item: T) => React.ReactNode
    className?: string
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    searchable?: boolean
    searchKeys?: (keyof T)[]
    itemsPerPage?: number
    onRowClick?: (item: T) => void
    actions?: (item: T) => React.ReactNode
    emptyMessage?: string
    emptyAction?: React.ReactNode
}

export default function DataTable<T>({
    data,
    columns,
    searchable = true,
    searchKeys = [],
    itemsPerPage = 10,
    onRowClick,
    actions,
    emptyMessage = 'No data found.',
    emptyAction,
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const filteredData = useMemo(() => {
        if (!searchTerm) return data
        return data.filter((item) => {
            return searchKeys.some((key) => {
                const value = item[key]
                return String(value).toLowerCase().includes(searchTerm.toLowerCase())
            })
        })
    }, [data, searchTerm, searchKeys])

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage)

    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            {searchable && (
                <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                {actions && <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentData.length > 0 ? (
                                currentData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={`group transition-colors hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={`px-6 py-4 text-sm text-gray-700 ${col.className || ''}`}
                                            >
                                                {col.cell
                                                    ? col.cell(item)
                                                    : col.accessorKey
                                                        ? String(item[col.accessorKey])
                                                        : '-'}
                                            </td>
                                        ))}
                                        {actions && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {actions(item)}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length + (actions ? 1 : 0)}
                                        className="px-6 py-16 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">{emptyMessage}</p>
                                            <p className="text-xs text-gray-500">No records match your current filters</p>
                                            {emptyAction && <div className="mt-1">{emptyAction}</div>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{' '}
                        <span className="font-medium text-gray-900">
                            {Math.min(startIndex + itemsPerPage, filteredData.length)}
                        </span>{' '}
                        of <span className="font-medium text-gray-900">{filteredData.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
