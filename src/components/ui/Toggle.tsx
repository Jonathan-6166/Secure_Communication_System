import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-center justify-between gap-4 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-ink-800 dark:text-ink-200">{label}</p>}
          {description && <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
          checked ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, className }: SegmentedProps<T>) {
  return (
    <div className={cn('inline-flex p-1 bg-ink-100 dark:bg-ink-800 rounded-xl', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
            value === opt.value
              ? 'bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 shadow-sm'
              : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
