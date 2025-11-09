/**
 * Input Component
 *
 * Mobile-optimized, accessible input with validation states
 * Smart keyboard types for SA ID numbers, phone numbers
 */

import React from 'react';
import { tokens } from '../tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`
            block w-full
            px-4 py-3
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            text-base
            text-gray-900
            bg-white
            border-2
            ${hasError ? 'border-danger-500 focus:border-danger-600' : 'border-gray-300 focus:border-primary-500'}
            rounded
            placeholder-gray-400
            transition-colors duration-250
            focus:outline-none focus:ring-2
            ${hasError ? 'focus:ring-danger-500' : 'focus:ring-primary-500'}
            focus:ring-opacity-50
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
            min-h-[48px]
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined
          }
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            {rightIcon}
          </div>
        )}

        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-danger-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-2 text-sm text-danger-600 flex items-start gap-1"
          role="alert"
        >
          <svg
            className="h-4 w-4 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {helpText && !error && (
        <p
          id={`${inputId}-help`}
          className="mt-2 text-sm text-gray-500"
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Textarea Component
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helpText,
  fullWidth = true,
  className = '',
  id,
  rows = 4,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        className={`
          block w-full
          px-4 py-3
          text-base
          text-gray-900
          bg-white
          border-2
          ${hasError ? 'border-danger-500 focus:border-danger-600' : 'border-gray-300 focus:border-primary-500'}
          rounded
          placeholder-gray-400
          transition-colors duration-250
          focus:outline-none focus:ring-2
          ${hasError ? 'focus:ring-danger-500' : 'focus:ring-primary-500'}
          focus:ring-opacity-50
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
          resize-vertical
          ${className}
        `}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined
        }
        {...props}
      />

      {error && (
        <p
          id={`${textareaId}-error`}
          className="mt-2 text-sm text-danger-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {helpText && !error && (
        <p
          id={`${textareaId}-help`}
          className="mt-2 text-sm text-gray-500"
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Input;
