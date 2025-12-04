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
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return data

        return data.filter((item) => {
            return searchKeys.some((key) => {
                const value = item[key]
                return String(value).toLowerCase().includes(searchTerm.toLowerCase())
            })
        })
    }, [data, searchTerm, searchKeys])

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage)

    // Reset page when search changes
    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            {searchable && (
                <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                {actions && <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {currentData.length > 0 ? (
                                currentData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={`group transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''
                                            }`}
                                    >
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={`px-6 py-4 text-sm text-slate-700 dark:text-slate-200 ${col.className || ''}`}
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
                                        className="px-6 py-12 text-center text-slate-600 dark:text-slate-400"
                                    >
                                        {emptyMessage}
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
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Showing <span className="font-medium text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                        <span className="font-medium text-slate-900 dark:text-white">
                            {Math.min(startIndex + itemsPerPage, filteredData.length)}
                        </span>{' '}
                        of <span className="font-medium text-slate-900 dark:text-white">{filteredData.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />

                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
