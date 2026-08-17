import { useState, useEffect, useCallback } from 'react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { getContactsWithProfiles, findUserByEmail } from '@/lib/queries';
import type { Contact, ConversationPartner } from '@/lib/types';
import {
  UserPlus, Search, Trash2, MessageSquare, Mail, Clock,
  Users, Check, X, AlertTriangle, UserCheck,
} from 'lucide-react';

interface ContactsPageProps {
  onMessageContact: (contact: ConversationPartner) => void;
}

export function ContactsPage({ onMessageContact }: ContactsPageProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<{ contact: Contact; profile: ConversationPartner }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await getContactsWithProfiles(user.id);
    setContacts(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!user || !addEmail.trim()) return;
    setAdding(true);
    setAddStatus(null);
    try {
      const found = await findUserByEmail(addEmail.trim());
      if (!found) {
        setAddStatus({ type: 'error', msg: 'No user found with that name. Try their exact display name.' });
        setAdding(false);
        return;
      }
      if (found.id === user.id) {
        setAddStatus({ type: 'error', msg: "You can't add yourself as a contact." });
        setAdding(false);
        return;
      }
      // Check if already exists
      const existing = contacts.find((c) => c.contact.contact_id === found.id);
      if (existing) {
        setAddStatus({ type: 'info', msg: `${found.display_name} is already in your contacts.` });
        setAdding(false);
        return;
      }
      const { error } = await supabase.from('contacts').insert({
        owner_id: user.id,
        contact_id: found.id,
        status: 'accepted',
      });
      if (error) throw error;
      setAddStatus({ type: 'success', msg: `${found.display_name} added to your contacts.` });
      setAddEmail('');
      load();
    } catch (err) {
      setAddStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to add contact' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from('contacts').delete().eq('id', id);
    load();
  };

  const filtered = search
    ? contacts.filter((c) => c.profile.display_name.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Contacts</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Manage your trusted connections.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className="input pl-10" />
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={search ? 'No matching contacts' : 'No contacts yet'}
            description={search ? 'Try a different search term.' : 'Add your first contact to start sending secure messages.'}
            action={!search && <button onClick={() => setShowAdd(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> Add Contact</button>}
          />
        ) : (
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map(({ contact, profile }) => (
              <div key={contact.id} className="flex items-center gap-4 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
                <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" status={profile.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-800 dark:text-ink-200">{profile.display_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={profile.status === 'online' ? 'success' : profile.status === 'away' ? 'warning' : 'default'}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {profile.status}
                    </Badge>
                    <span className="text-xs text-ink-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Added {timeAgo(contact.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onMessageContact(profile)} className="btn-secondary py-2 px-3">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRemove(contact.id)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add contact modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddStatus(null); setAddEmail(''); }} title="Add a Contact" size="sm">
        <div className="space-y-4">
          <Alert variant="info" title="Find a user">
            Enter the display name of the person you want to add. They must have a CipherPix account.
          </Alert>
          <div>
            <label className="label">Display Name</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="input pl-10"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          {addStatus && (
            <Alert variant={addStatus.type === 'success' ? 'success' : addStatus.type === 'error' ? 'error' : 'info'}>
              {addStatus.msg}
            </Alert>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowAdd(false); setAddStatus(null); setAddEmail(''); }} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={adding || !addEmail.trim()} className="btn-primary">
              {adding ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />} Add Contact
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
