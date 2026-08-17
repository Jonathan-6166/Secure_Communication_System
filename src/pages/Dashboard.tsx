import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Page } from '@/components/Sidebar';
import type { ActivityEntry, Message } from '@/lib/types';
import {
  Mail, MailOpen, Send, Users, MessageSquare, Image as ImageIcon,
  ShieldCheck, Lock, Activity, ArrowRight, PlusCircle, Upload, Settings,
  TrendingUp, Clock,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (p: Page) => void;
}

interface Stats {
  totalMessages: number;
  unreadCount: number;
  sentCount: number;
  activeContacts: number;
  stegoCount: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [inbox, sent, contacts, stego, activity] = await Promise.all([
      supabase.from('messages').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('owner_id', user.id).eq('status', 'accepted'),
      supabase.from('stego_history').select('*').eq('user_id', user.id),
      supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    ]);

    const inboxData = (inbox.data ?? []) as Message[];
    const sentData = (sent.data ?? []) as Message[];
    setStats({
      totalMessages: inboxData.length + sentData.length,
      unreadCount: inboxData.filter((m) => !m.read_at).length,
      sentCount: sentData.length,
      activeContacts: (contacts.data ?? []).length,
      stegoCount: (stego.data ?? []).length,
    });
    setRecentActivity((activity.data ?? []) as ActivityEntry[]);
    setRecentMessages(inboxData.slice(0, 5));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
  }

  const statCards = [
    { label: 'Total Messages', value: stats?.totalMessages ?? 0, icon: MessageSquare, color: 'text-brand-600 bg-brand-100 dark:bg-brand-950/50' },
    { label: 'Unread', value: stats?.unreadCount ?? 0, icon: Mail, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/50' },
    { label: 'Sent', value: stats?.sentCount ?? 0, icon: Send, color: 'text-sky-600 bg-sky-100 dark:bg-sky-950/50' },
    { label: 'Active Contacts', value: stats?.activeContacts ?? 0, icon: Users, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50' },
  ];

  const quickActions = [
    { label: 'New Message', desc: 'Compose a secure message', icon: PlusCircle, page: 'messages' as Page, color: 'from-brand-500 to-brand-600' },
    { label: 'Encode Image', desc: 'Hide a message in an image', icon: Upload, page: 'stego' as Page, color: 'from-sky-500 to-sky-600' },
    { label: 'Manage Contacts', desc: 'Add or review connections', icon: Users, page: 'contacts' as Page, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Settings', desc: 'Privacy & preferences', icon: Settings, page: 'settings' as Page, color: 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">
            Welcome back, {profile?.display_name?.split(' ')[0] ?? 'there'}
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Here's your secure messaging overview.
          </p>
        </div>
        <Badge variant="success" className="px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> End-to-end encrypted
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5 hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-3xl font-bold text-ink-900 dark:text-ink-100 mt-2">{s.value}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Quick Actions</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.page)}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-soft transition-all text-left"
                >
                  <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0', a.color)}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink-800 dark:text-ink-200">{a.label}</p>
                    <p className="text-xs text-ink-400 truncate">{a.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent messages */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-ink-900 dark:text-ink-100">Recent Messages</h3>
              </div>
              <button onClick={() => onNavigate('messages')} className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
                View all
              </button>
            </div>
            {recentMessages.length === 0 ? (
              <EmptyState icon={<Mail className="w-6 h-6" />} title="No messages yet" description="Your inbox is empty. Start a conversation with a contact." />
            ) : (
              <div className="space-y-2">
                {recentMessages.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors cursor-pointer" onClick={() => onNavigate('messages')}>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', m.read_at ? 'bg-ink-100 dark:bg-ink-800 text-ink-400' : 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400')}>
                      {m.read_at ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-200 truncate">{m.subject || '(no subject)'}</p>
                      <p className="text-xs text-ink-400 truncate">{m.body.slice(0, 60)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.has_stego && <ImageIcon className="w-3.5 h-3.5 text-brand-500" />}
                      <span className="text-[11px] text-ink-400">{timeAgo(m.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Activity Log</h3>
            </div>
            <button onClick={() => onNavigate('activity')} className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
              View all
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState icon={<Clock className="w-6 h-6" />} title="No activity yet" />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />
                    <div className="w-px flex-1 bg-ink-200 dark:bg-ink-700 mt-1" />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm text-ink-800 dark:text-ink-200">{a.description}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />{timeAgo(a.created_at)}
                      {a.event_type === 'login' && <Lock className="w-3 h-3 text-emerald-500" />}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
