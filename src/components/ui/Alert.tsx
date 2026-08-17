import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  className?: string;
}

const config = {
  info: { icon: Info, cls: 'bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900' },
  success: { icon: CheckCircle2, cls: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900' },
  error: { icon: XCircle, cls: 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900' },
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, cls } = config[variant];
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4 text-sm', cls, className)}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}
