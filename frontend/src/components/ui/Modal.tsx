'use client'

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'md',
}: ModalProps) {
    const [show, setShow] = useState(isOpen)

    useEffect(() => {
        if (isOpen) {
            setShow(true)
            document.body.style.overflow = 'hidden'
        } else {
            const timer = setTimeout(() => setShow(false), 300)
            document.body.style.overflow = 'unset'
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!show) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div
                className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-all duration-300 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
