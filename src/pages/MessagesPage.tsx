import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, formatTimeShort, timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Toggle';
import { ComposeModal } from '@/components/messages/ComposeModal';
import { MessageDetail } from '@/components/messages/MessageDetail';
import { getProfiles } from '@/lib/queries';
import type { Message, ConversationPartner } from '@/lib/types';
import {
  Inbox, Send, Search, Plus, Mail, MailOpen, Image as ImageIcon,
  Lock, ArrowLeft, MessageSquare,
} from 'lucide-react';

type Tab = 'inbox' | 'outbox' | 'conversations';

export function MessagesPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const [profiles, setProfiles] = useState<Map<string, ConversationPartner>>(new Map());
  const [showCompose, setShowCompose] = useState(false);
  const [conversations, setConversations] = useState<{ partner: ConversationPartner; messages: Message[]; unread: number }[]>([]);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [inbox, outbox] = await Promise.all([
      supabase.from('messages').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }),
    ]);
    const all = [...(inbox.data ?? []), ...(outbox.data ?? [])] as Message[];
    // Build profile map
    const partnerIds = all.map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id));
    const map = await getProfiles(partnerIds);
    setProfiles(map);

    // Build conversations
    const convMap = new Map<string, Message[]>();
    for (const m of all) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!convMap.has(partnerId)) convMap.set(partnerId, []);
      convMap.get(partnerId)!.push(m);
    }
    const convList = Array.from(convMap.entries()).map(([pid, msgs]) => {
      const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        partner: map.get(pid) ?? { id: pid, display_name: 'Unknown', avatar_url: null, status: 'offline' as const },
        messages: sorted,
        unread: sorted.filter((m) => m.recipient_id === user.id && !m.read_at).length,
      };
    });
    convList.sort((a, b) => new Date(b.messages[0].created_at).getTime() - new Date(a.messages[0].created_at).getTime());
    setConversations(convList);

    if (tab === 'inbox') setMessages((inbox.data ?? []) as Message[]);
    else if (tab === 'outbox') setMessages((outbox.data ?? []) as Message[]);
    else setMessages(all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }, [user, tab]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Mark as read when opened
  useEffect(() => {
    if (selected && user && selected.recipient_id === user.id && !selected.read_at) {
      supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', selected.id).then(() => loadMessages());
    }
  }, [selected, user, loadMessages]);

  const filtered = search
    ? messages.filter((m) => {
        const partner = profiles.get(m.sender_id === user?.id ? m.recipient_id : m.sender_id);
        const q = search.toLowerCase();
        return (
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          partner?.display_name.toLowerCase().includes(q)
        );
      })
    : messages;

  const getPartner = (m: Message): ConversationPartner => {
    const pid = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
    return profiles.get(pid) ?? { id: pid, display_name: 'Unknown', avatar_url: null, status: 'offline' };
  };

  return (
    <div className="flex h-full">
      {/* Message list */}
      <div className={cn('flex flex-col border-r border-ink-200 dark:border-ink-800 transition-all', selected ? 'w-0 md:w-96 overflow-hidden' : 'w-full md:w-96')}>
        <div className="p-4 space-y-3 border-b border-ink-200 dark:border-ink-800">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-900 dark:text-ink-100">Messages</h2>
            <button onClick={() => setShowCompose(true)} className="btn-primary py-2 px-3">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
            </button>
          </div>
          <Segmented
            value={tab}
            onChange={(v) => { setTab(v); setSelected(null); }}
            options={[
              { value: 'inbox', label: 'Inbox' },
              { value: 'outbox', label: 'Sent' },
              { value: 'conversations', label: 'Threads' },
            ]}
            className="w-full"
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="input pl-10 py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : tab === 'conversations' ? (
            conversations.length === 0 ? (
              <EmptyState icon={<MessageSquare className="w-6 h-6" />} title="No conversations" description="Start messaging a contact to see conversation threads here." />
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.partner.id}
                  onClick={() => setSelected(conv.messages[0])}
                  className="w-full flex items-center gap-3 p-4 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors border-b border-ink-100 dark:border-ink-800/50 text-left"
                >
                  <Avatar name={conv.partner.display_name} src={conv.partner.avatar_url} size="md" status={conv.partner.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-ink-800 dark:text-ink-200 truncate">{conv.partner.display_name}</p>
                      <span className="text-[11px] text-ink-400 shrink-0">{timeAgo(conv.messages[0].created_at)}</span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 truncate mt-0.5">
                      {conv.messages[0].subject || conv.messages[0].body.slice(0, 50) || '(no content)'}
                    </p>
                  </div>
                  {conv.unread > 0 && <Badge variant="brand" className="shrink-0">{conv.unread}</Badge>}
                </button>
              ))
            )
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={tab === 'inbox' ? <Inbox className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              title={tab === 'inbox' ? 'Inbox is empty' : 'No sent messages'}
              description={search ? 'No messages match your search.' : 'Messages you receive will appear here.'}
              action={!search && <button onClick={() => setShowCompose(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Message</button>}
            />
          ) : (
            filtered.map((m) => {
              const partner = getPartner(m);
              const isUnread = !m.read_at && m.recipient_id === user?.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors border-b border-ink-100 dark:border-ink-800/50 text-left',
                    isUnread && 'bg-brand-50/40 dark:bg-brand-950/15',
                    selected?.id === m.id && 'bg-brand-50 dark:bg-brand-950/30',
                  )}
                >
                  <Avatar name={partner.display_name} src={partner.avatar_url} size="md" status={partner.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', isUnread ? 'font-bold text-ink-900 dark:text-ink-100' : 'font-medium text-ink-700 dark:text-ink-300')}>
                        {partner.display_name}
                      </p>
                      <span className="text-[11px] text-ink-400 shrink-0">{formatTimeShort(m.created_at)}</span>
                    </div>
                    <p className={cn('text-xs truncate mt-0.5', isUnread ? 'text-ink-600 dark:text-ink-400' : 'text-ink-400')}>
                      {m.subject || '(no subject)'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {m.has_stego && <ImageIcon className="w-3 h-3 text-brand-500" />}
                      {m.encryption_status === 'encrypted' && <Lock className="w-3 h-3 text-emerald-500" />}
                      {!m.read_at && m.recipient_id === user?.id ? (
                        <Mail className="w-3 h-3 text-ink-400" />
                      ) : (
                        m.recipient_id === user?.id && <MailOpen className="w-3 h-3 text-ink-400" />
                      )}
                    </div>
                  </div>
                  {isUnread && <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 p-4 border-b border-ink-200 dark:border-ink-800">
            <button onClick={() => setSelected(null)} className="btn-ghost p-2 md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <p className="font-semibold text-ink-900 dark:text-ink-100">Message Detail</p>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <MessageDetail
              message={selected}
              partner={getPartner(selected)}
              direction={selected.recipient_id === user?.id ? 'inbox' : 'outbox'}
              onDecrypt={() => {}}
            />
          </div>
        </div>
      )}

      {/* Empty state when no message selected */}
      {!selected && !loading && messages.length > 0 && tab !== 'conversations' && (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <EmptyState icon={<Mail className="w-6 h-6" />} title="Select a message" description="Choose a message from the list to view its contents." />
        </div>
      )}
      {!selected && !loading && conversations.length > 0 && tab === 'conversations' && (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <EmptyState icon={<MessageSquare className="w-6 h-6" />} title="Select a conversation" description="Choose a conversation to view the message thread." />
        </div>
      )}

      <ComposeModal open={showCompose} onClose={() => setShowCompose(false)} onSent={loadMessages} />
    </div>
  );
}
