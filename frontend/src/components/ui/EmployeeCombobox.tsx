'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface Employee {
    employee_id: number
    first_name: string
    last_name: string
    id_number: string
    role: string
    status?: string
}

interface EmployeeComboboxProps {
    value: number | null
    onChange: (employeeId: number | null) => void
    employees: Employee[]
    placeholder?: string
    disabled?: boolean
    required?: boolean
    className?: string
    label?: string
}

export default function EmployeeCombobox({
    value,
    onChange,
    employees,
    placeholder = 'Search employees...',
    disabled = false,
    required = false,
    className = '',
    label,
}: EmployeeComboboxProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    // Find the currently selected employee
    const selectedEmployee = useMemo(
        () => employees.find((e) => e.employee_id === value) ?? null,
        [employees, value]
    )

    // Filter and sort employees: active first, then inactive, filtered by query
    const filteredEmployees = useMemo(() => {
        const q = query.toLowerCase().trim()

        const matched = q
            ? employees.filter((e) => {
                  const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
                  return (
                      fullName.includes(q) ||
                      e.first_name.toLowerCase().includes(q) ||
                      e.last_name.toLowerCase().includes(q) ||
                      e.id_number.toLowerCase().includes(q)
                  )
              })
            : [...employees]

        // Sort: active employees first, then inactive
        return matched.sort((a, b) => {
            const aActive = (a.status?.toLowerCase() ?? 'active') === 'active'
            const bActive = (b.status?.toLowerCase() ?? 'active') === 'active'
            if (aActive && !bActive) return -1
            if (!aActive && bActive) return 1
            // Within same status group, sort by last name then first name
            const lastCmp = a.last_name.localeCompare(b.last_name)
            if (lastCmp !== 0) return lastCmp
            return a.first_name.localeCompare(b.first_name)
        })
    }, [employees, query])

    // Reset highlighted index when filtered list changes
    useEffect(() => {
        setHighlightedIndex(-1)
    }, [filteredEmployees.length])

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-combobox-option]')
            const item = items[highlightedIndex] as HTMLElement | undefined
            item?.scrollIntoView({ block: 'nearest' })
        }
    }, [highlightedIndex])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                // Restore display text if an employee is selected
                if (selectedEmployee) {
                    setQuery('')
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [selectedEmployee])

    const handleSelect = useCallback(
        (employee: Employee) => {
            onChange(employee.employee_id)
            setQuery('')
            setIsOpen(false)
            setHighlightedIndex(-1)
            inputRef.current?.blur()
        },
        [onChange]
    )

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onChange(null)
            setQuery('')
            setIsOpen(false)
            setHighlightedIndex(-1)
            inputRef.current?.focus()
        },
        [onChange]
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        if (!isOpen) {
            setIsOpen(true)
        }
    }

    const handleInputFocus = () => {
        setIsOpen(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                setIsOpen(true)
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev < filteredEmployees.length - 1 ? prev + 1 : 0
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredEmployees.length - 1
                )
                break
            case 'Enter':
                e.preventDefault()
                if (
                    highlightedIndex >= 0 &&
                    highlightedIndex < filteredEmployees.length
                ) {
                    handleSelect(filteredEmployees[highlightedIndex])
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                if (selectedEmployee) {
                    setQuery('')
                }
                inputRef.current?.blur()
                break
        }
    }

    const displayValue = isOpen
        ? query
        : selectedEmployee
          ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
          : ''

    const isInactive = (employee: Employee) =>
        employee.status != null && employee.status.toLowerCase() !== 'active'

    const capitalizeFirst = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                    {required && (
                        <span className="text-red-500 ml-0.5">*</span>
                    )}
                </label>
            )}

            {/* Input container */}
            <div className="relative">
                {/* Search icon */}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />

                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-required={required}
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                        selectedEmployee && !isOpen ? 'pr-16' : 'pr-10'
                    }`}
                />

                {/* Right side buttons */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Clear button */}
                    {selectedEmployee && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Clear selection"
                            tabIndex={-1}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Chevron */}
                    <button
                        type="button"
                        onClick={() => {
                            if (!disabled) {
                                setIsOpen((prev) => !prev)
                                inputRef.current?.focus()
                            }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label="Toggle dropdown"
                        tabIndex={-1}
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Dropdown list */}
            {isOpen && (
                <ul
                    ref={listRef}
                    role="listbox"
                    className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                    {filteredEmployees.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                            No employees found
                        </li>
                    ) : (
                        filteredEmployees.map((employee, index) => {
                            const inactive = isInactive(employee)
                            const isSelected =
                                employee.employee_id === value
                            const isHighlighted = index === highlightedIndex

                            return (
                                <li
                                    key={employee.employee_id}
                                    data-combobox-option
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(employee)}
                                    onMouseEnter={() =>
                                        setHighlightedIndex(index)
                                    }
                                    className={`px-4 py-2.5 cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : ''
                                    } ${
                                        isHighlighted && !isSelected
                                            ? 'bg-slate-100 dark:bg-slate-700'
                                            : ''
                                    } ${
                                        inactive
                                            ? 'opacity-50'
                                            : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`text-sm font-medium ${
                                                inactive
                                                    ? 'text-slate-400 dark:text-slate-500'
                                                    : 'text-slate-900 dark:text-slate-100'
                                            }`}
                                        >
                                            {employee.first_name}{' '}
                                            {employee.last_name}
                                        </span>
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            {capitalizeFirst(employee.role)}
                                        </span>
                                    </div>
                                    <div
                                        className={`text-xs mt-0.5 ${
                                            inactive
                                                ? 'text-slate-400 dark:text-slate-600'
                                                : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        {employee.id_number}
                                    </div>
                                </li>
                            )
                        })
                    )}
                </ul>
            )}
        </div>
    )
}
