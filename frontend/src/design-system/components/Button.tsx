/**
 * Button Component
 *
 * Mobile-optimized, accessible button with loading states
 * Minimum 48px tap target for SA users
 */

import React from 'react';
import { tokens } from '../tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.typography.fontFamily.sans,
    fontWeight: tokens.typography.fontWeight.semibold,
    borderRadius: tokens.borderRadius.sm,
    transition: tokens.transitions.base,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
    outline: 'none',
    position: 'relative' as const,
  };

  const sizeStyles = {
    sm: {
      fontSize: tokens.typography.fontSize.sm,
      padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
      minHeight: tokens.tapTargets.minimum, // 44px minimum
      gap: tokens.spacing[2],
    },
    md: {
      fontSize: tokens.typography.fontSize.base,
      padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
      minHeight: tokens.tapTargets.recommended, // 48px recommended
      gap: tokens.spacing[2],
    },
    lg: {
      fontSize: tokens.typography.fontSize.lg,
      padding: `${tokens.spacing[4]} ${tokens.spacing[8]}`,
      minHeight: tokens.tapTargets.comfortable, // 56px for primary actions
      gap: tokens.spacing[3],
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: tokens.colors.accent[500],
      color: tokens.colors.text.inverse,
      boxShadow: tokens.shadows.sm,
      '&:hover': {
        backgroundColor: tokens.colors.accent[600],
        boxShadow: tokens.shadows.md,
      },
      '&:active': {
        backgroundColor: tokens.colors.accent[700],
        transform: 'translateY(1px)',
      },
    },
    secondary: {
      backgroundColor: tokens.colors.primary[500],
      color: tokens.colors.text.inverse,
      boxShadow: tokens.shadows.sm,
      '&:hover': {
        backgroundColor: tokens.colors.primary[600],
        boxShadow: tokens.shadows.md,
      },
      '&:active': {
        backgroundColor: tokens.colors.primary[700],
        transform: 'translateY(1px)',
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: tokens.colors.primary[500],
      border: `2px solid ${tokens.colors.primary[500]}`,
      '&:hover': {
        backgroundColor: tokens.colors.primary[50],
        borderColor: tokens.colors.primary[600],
      },
      '&:active': {
        backgroundColor: tokens.colors.primary[100],
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.primary,
      '&:hover': {
        backgroundColor: tokens.colors.gray[100],
      },
      '&:active': {
        backgroundColor: tokens.colors.gray[200],
      },
    },
    danger: {
      backgroundColor: tokens.colors.danger[500],
      color: tokens.colors.text.inverse,
      boxShadow: tokens.shadows.sm,
      '&:hover': {
        backgroundColor: tokens.colors.danger[600],
        boxShadow: tokens.shadows.md,
      },
      '&:active': {
        backgroundColor: tokens.colors.danger[700],
        transform: 'translateY(1px)',
      },
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
  };

  const variantClassName = (() => {
    const variantMap = {
      primary: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm hover:shadow-md',
      secondary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md',
      outline: 'bg-transparent text-primary-500 border-2 border-primary-500 hover:bg-primary-50 hover:border-primary-600 active:bg-primary-100',
      ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 active:bg-gray-200',
      danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md',
    };
    return variantMap[variant];
  })();

  const sizeClassName = (() => {
    const sizeMap = {
      sm: 'text-sm px-4 py-2 min-h-[44px] gap-2',
      md: 'text-base px-6 py-3 min-h-[48px] gap-2',
      lg: 'text-lg px-8 py-4 min-h-[56px] gap-3',
    };
    return sizeMap[size];
  })();

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-semibold rounded
        transition-all duration-250
        ${variantClassName}
        ${sizeClassName}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${loading ? 'pointer-events-none' : ''}
        active:translate-y-[1px]
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variant === 'primary' ? 'focus:ring-accent-500' : 'focus:ring-primary-500'}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
