import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-ink-400 dark:text-ink-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-800 dark:text-ink-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 dark:text-ink-400 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
