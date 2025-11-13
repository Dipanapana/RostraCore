import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  subtitle?: string
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}

const colorClasses = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    trend: 'text-blue-600',
  },
  green: {
    icon: 'bg-green-50 text-green-600',
    trend: 'text-green-600',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-600',
    trend: 'text-orange-600',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    trend: 'text-red-600',
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600',
    trend: 'text-purple-600',
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = 'blue',
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`rounded-lg p-3 ${colors.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
