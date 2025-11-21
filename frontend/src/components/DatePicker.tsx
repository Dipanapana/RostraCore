'use client';

/**
 * Custom Date Picker Component
 * 
 * Wraps react-datepicker with custom styling and functionality
 * to provide a consistent, user-friendly date selection experience
 */

import React, { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
    selected: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholderText?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
}

// Custom input component with calendar icon
const CustomInput = forwardRef<HTMLButtonElement, any>(
    ({ value, onClick, placeholder, disabled, className }, ref) => (
        <button
            type="button"
            onClick={onClick}
            ref={ref}
            disabled={disabled}
            className={`w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
                } ${className || ''}`}
        >
            <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                {value || placeholder}
            </span>
            <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
        </button>
    )
);

CustomInput.displayName = 'CustomInput';

export default function DatePicker({
    selected,
    onChange,
    minDate,
    maxDate,
    placeholderText = 'Select date',
    disabled = false,
    className = '',
    label,
}: DatePickerProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}
            <ReactDatePicker
                selected={selected}
                onChange={onChange}
                minDate={minDate}
                maxDate={maxDate}
                placeholderText={placeholderText}
                disabled={disabled}
                dateFormat="yyyy-MM-dd"
                customInput={<CustomInput className={className} />}
                showPopperArrow={false}
                popperClassName="date-picker-popper"
                calendarClassName="date-picker-calendar"
                wrapperClassName="w-full"
            />
        </div>
    );
}
