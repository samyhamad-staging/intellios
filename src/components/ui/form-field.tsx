'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from './cn';

/**
 * FormField Props
 *
 * Standardizes form field layouts across the Intellios application.
 * Handles label, description, error state, required/optional indicators,
 * character count, and on-blur touched state.
 */
export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Optional sublabel / help text below the label */
  description?: string;
  /** HTML id for the input (links label to input via htmlFor) */
  htmlFor?: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether the field is required (shows asterisk) */
  required?: boolean;
  /** Whether the field is optional (shows "(optional)" text) */
  optional?: boolean;
  /** Children — the actual input/select/textarea */
  children: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Maximum character count — shows a live counter when provided */
  maxLength?: number;
  /** Current character count for the field (pass value.length) */
  currentLength?: number;
  /** Whether the field has been blurred/touched (shows error only after touch) */
  touched?: boolean;
}

/**
 * FormField Component
 *
 * Wraps form inputs with standardized layout, labeling, and error handling.
 * Uses design tokens from globals.css for consistent styling.
 *
 * Usage:
 * ```tsx
 * <FormField label="Email" htmlFor="email" error={errors.email}>
 *   <input id="email" type="email" />
 * </FormField>
 * ```
 */
export const FormField = React.forwardRef<
  HTMLDivElement,
  FormFieldProps
>(
  (
    {
      label,
      description,
      htmlFor,
      error,
      required,
      optional,
      children,
      className,
      maxLength,
      currentLength,
      touched,
    },
    ref
  ) => {
    // Show error only after the field has been touched (on-blur validation)
    // If `touched` is not provided, always show errors (legacy behaviour)
    const showError = error && (touched === undefined || touched);
    const charCount = currentLength ?? 0;
    const nearLimit = maxLength && charCount >= maxLength * 0.85;
    const overLimit = maxLength && charCount > maxLength;

    return (
      <div ref={ref} className={cn('flex flex-col', className)}>
        {/* Label row — label + optional character counter */}
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className="text-sm font-medium text-text"
          >
            {label}
            {required && <span className="text-danger-text ml-1">*</span>}
            {optional && !required && (
              <span className="text-text-tertiary ml-1 font-normal text-xs">
                (optional)
              </span>
            )}
          </label>
          {maxLength !== undefined && (
            <span
              className={cn(
                'text-xs tabular-nums shrink-0',
                overLimit
                  ? 'text-danger font-medium'
                  : nearLimit
                    ? 'text-warning'
                    : 'text-text-tertiary'
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>

        {/* Description text below label */}
        {description && (
          <p className="text-xs text-text-tertiary mt-0.5">
            {description}
          </p>
        )}

        {/* Input wrapped with top margin */}
        <div className="mt-1.5">
          {children}
        </div>

        {/* Error message with icon — only shown after touch */}
        {showError && (
          <div className="flex items-start gap-1.5 mt-1 text-xs text-danger-text">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

/**
 * FormSection Props
 *
 * Groups related form fields with a title and optional description.
 * Renders with visual separation (bottom border) from other sections.
 */
export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Form fields or other content */
  children: React.ReactNode;
  /** Whether this is the last section (omits bottom border) */
  isLast?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * FormSection Component
 *
 * Organizes related form fields into visually distinct sections.
 * Automatically handles spacing and bottom borders between sections.
 *
 * Usage:
 * ```tsx
 * <FormSection title="Personal Information" description="Your basic details">
 *   <FormField label="Name" htmlFor="name">
 *     <input id="name" type="text" />
 *   </FormField>
 * </FormSection>
 * ```
 */
export const FormSection = React.forwardRef<
  HTMLDivElement,
  FormSectionProps
>(
  (
    { title, description, children, isLast = false, className },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          !isLast && 'border-b border-border-subtle pb-6 mb-6',
          className
        )}
      >
        {/* Section title */}
        <h3 className="text-sm font-semibold text-text">{title}</h3>

        {/* Optional section description */}
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">
            {description}
          </p>
        )}

        {/* Form fields with spacing */}
        <div className="mt-4 space-y-4">
          {children}
        </div>
      </div>
    );
  }
);

FormSection.displayName = 'FormSection';
