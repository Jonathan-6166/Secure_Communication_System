import { useState, useRef, useEffect } from 'react';
import { cn, timeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Bell, Search, Check, Clock, ShieldAlert, MessageSquare, Info } from 'lucide-react';

interface TopbarProps {
  title: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
}

const notifIcon: Record<string, typeof Bell> = {
  message: MessageSquare,
  security: ShieldAlert,
  system: Info,
};

export function Topbar({ title, onSearch, searchPlaceholder }: TopbarProps) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 h-16 px-6 bg-white dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800 shrink-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <h1 className="text-lg font-bold text-ink-900 dark:text-ink-100 truncate">{title}</h1>
        {onSearch && (
          <div className="relative hidden sm:block max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder={searchPlaceholder ?? 'Search...'}
              onChange={(e) => onSearch(e.target.value)}
              className="input pl-10 py-2"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative btn-ghost p-2.5"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 card max-h-96 overflow-y-auto scrollbar-thin z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-800 sticky top-0 bg-white dark:bg-ink-900">
                <p className="font-semibold text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = notifIcon[n.type] ?? Info;
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'w-full flex gap-3 px-4 py-3 text-left hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors border-b border-ink-100 dark:border-ink-800/50',
                        !n.read_at && 'bg-brand-50/50 dark:bg-brand-950/20',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', !n.read_at ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800 dark:text-ink-200 truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{n.body}</p>}
                        <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read_at && <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Status badge */}
        {profile && (
          <Badge variant={profile.status === 'online' ? 'success' : profile.status === 'away' ? 'warning' : 'default'} className="hidden md:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {profile.status}
          </Badge>
        )}

        {/* Avatar */}
        {profile && <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" status={profile.status} />}
      </div>
    </header>
  );
}
