/**
 * Reusable form field primitives for submission forms.
 */

import { cloneElement, isValidElement } from 'react';
import { Input as UiInput } from '@nawhas/ui/components/input';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}

/**
 * Labelled field wrapper.
 *
 * When `required` is passed we also inject `required` + `aria-required="true"`
 * onto the direct child input element so the programmatic required state
 * matches the visible asterisk. Consumers pass a single `<Input>` (or
 * compatible control) as the child.
 */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
}: FormFieldProps): React.JSX.Element {
  const child =
    required && isValidElement(children)
      ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          required: true,
          'aria-required': 'true',
        })
      : children;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-[var(--text-dim)]">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-[var(--color-error-500)]">*</span>}
      </label>
      {child}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-[13px] text-[var(--text-faint)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-[var(--color-error-500)]">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function Input({ id, error, hint, className = '', ...rest }: InputProps): React.JSX.Element {
  const errorClasses = error ? 'border-[var(--color-error-500)] focus-visible:outline-[var(--color-error-500)]' : '';
  return (
    <UiInput
      id={id}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      aria-invalid={error ? 'true' : undefined}
      className={`${errorClasses} ${className}`.trim()}
      {...rest}
    />
  );
}
