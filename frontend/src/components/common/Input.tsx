import React, { forwardRef } from 'react';
import { InputProps } from '../../types';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      name,
      label,
      type = 'text',
      placeholder,
      value,
      onChange,
      onBlur,
      error,
      variant = 'default',
      size = 'md',
      disabled = false,
      required = false,
      className,
      leftIcon,
      rightIcon,
      autoComplete,
      maxLength,
    },
    ref
  ) => {
    // Base input styles
    const baseStyles = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition-colors duration-200';
    
    // Size variations
    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };
    
    // Variant styles
    const variantStyles = {
      default: 'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
      outlined: 'border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
      filled: 'bg-gray-100 border-transparent dark:bg-gray-700 dark:text-white',
    };
    
    // Error styles
    const errorStyles = error
      ? 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-500'
      : '';
    
    // Disabled styles
    const disabledStyles = disabled
      ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-700 opacity-75'
      : '';
    
    // Combine all styles
    const inputStyles = twMerge(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      errorStyles,
      disabledStyles,
      className
    );
    
    // Generate a unique ID if not provided
    const inputId = id || `input-${name}`;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{leftIcon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={twMerge(
              inputStyles,
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : ''
            )}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{rightIcon}</span>
            </div>
          )}
        </div>
        
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-error-600 dark:text-error-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 