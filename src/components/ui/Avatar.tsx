import { cn, initials, avatarColor } from '@/lib/utils';
import type { UserStatus } from '@/lib/types';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusColor: Record<UserStatus, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-ink-400',
};

const statusRing: Record<string, string> = {
  xs: 'w-2 h-2 -right-0 -bottom-0',
  sm: 'w-2.5 h-2.5 -right-0 -bottom-0',
  md: 'w-3 h-3 -right-0.5 -bottom-0.5',
  lg: 'w-3.5 h-3.5 -right-0.5 -bottom-0.5',
  xl: 'w-4 h-4 -right-1 -bottom-1',
};

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold text-white overflow-hidden',
          sizeMap[size],
          !src && avatarColor(name),
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials(name)
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute rounded-full ring-2 ring-white dark:ring-ink-900',
            statusColor[status],
            statusRing[size],
          )}
        />
      )}
    </div>
  );
}
