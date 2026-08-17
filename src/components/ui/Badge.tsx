import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';
  className?: string;
}

const variantMap = {
  default: 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300',
  success: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  error: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  info: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400',
  brand: 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn('badge', variantMap[variant], className)}>{children}</span>;
}
