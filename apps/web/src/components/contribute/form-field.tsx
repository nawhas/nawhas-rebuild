/**
 * Reusable form field primitives for submission forms.
 */

import { Input as UiInput } from '@nawhas/ui/components/input';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
}: FormFieldProps): React.JSX.Element {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
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
  const errorClasses = error ? 'border-destructive focus-visible:ring-destructive' : '';
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
