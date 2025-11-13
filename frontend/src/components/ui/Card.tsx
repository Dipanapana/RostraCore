import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  hoverable?: boolean
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  className = '',
  hoverable = false,
}: CardProps) {
  const hoverClass = hoverable ? 'hover:shadow-card-hover' : ''

  return (
    <div
      className={`bg-white rounded-card shadow-card transition-shadow ${hoverClass} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className={`border-b border-gray-200 ${padding === 'none' ? 'p-6 pb-4' : paddingClasses[padding] + ' pb-4'}`}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {action && <div>{action}</div>}
          </div>
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  )
}
