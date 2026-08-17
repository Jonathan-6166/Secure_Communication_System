import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, formatTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ActivityEntry } from '@/lib/types';
import {
  Activity, LogIn, LogOut, UserPlus, MessageSquare, Shield,
  Image as ImageIcon, Lock, Clock, Eye,
} from 'lucide-react';

const eventIcons: Record<string, typeof Activity> = {
  login: LogIn,
  logout: LogOut,
  signup: UserPlus,
  message_sent: MessageSquare,
  message_received: MessageSquare,
  stego_encode: ImageIcon,
  stego_decode: ImageIcon,
  security: Shield,
};

const eventColors: Record<string, string> = {
  login: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
  logout: 'bg-ink-100 dark:bg-ink-800 text-ink-500',
  signup: 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400',
  message_sent: 'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
  message_received: 'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
  stego_encode: 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
  stego_decode: 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
  security: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
};

export function ActivityPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setEntries((data ?? []) as ActivityEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Activity Log</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Your recent security events and account activity.</p>
      </div>

      <div className="card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={<Activity className="w-6 h-6" />} title="No activity yet" description="Your login history and security events will appear here." />
        ) : (
          <div className="space-y-1">
            {entries.map((entry, idx) => {
              const Icon = eventIcons[entry.event_type] ?? Activity;
              return (
                <div key={entry.id} className="flex gap-4 py-3 relative">
                  {idx < entries.length - 1 && (
                    <div className="absolute left-[19px] top-12 bottom-0 w-px bg-ink-200 dark:bg-ink-700" />
                  )}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10', eventColors[entry.event_type] ?? 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-200">{entry.description}</p>
                      <span className="text-[11px] text-ink-400 shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(entry.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" className="text-[10px]">{entry.event_type.replace(/_/g, ' ')}</Badge>
                      {entry.event_type === 'login' && <Lock className="w-3 h-3 text-emerald-500" />}
                      {entry.ip && <span className="text-[11px] text-ink-400 flex items-center gap-1"><Eye className="w-3 h-3" /> {entry.ip}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
