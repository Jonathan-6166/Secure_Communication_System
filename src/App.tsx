import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Sidebar, type Page } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { MessagesPage } from '@/pages/MessagesPage';
import { StegoPage } from '@/pages/StegoPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { HelpPage } from '@/pages/HelpPage';
import { ComposeModal } from '@/components/messages/ComposeModal';
import { supabase } from '@/lib/supabase';
import type { ConversationPartner } from '@/lib/types';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  messages: 'Messages',
  stego: 'Steganography',
  contacts: 'Contacts',
  profile: 'Profile',
  settings: 'Settings',
  activity: 'Activity Log',
  help: 'Help & Support',
};

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<ConversationPartner | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Track unread message count for sidebar badge
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);
      setUnreadCount(count ?? 0);
    };
    load();
    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
    setSearchQuery('');
  }, []);

  const handleMessageContact = useCallback((contact: ConversationPartner) => {
    setComposeRecipient(contact);
    setShowCompose(true);
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50 dark:bg-ink-950">
      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        unreadMessages={unreadCount}
        onSignOut={signOut}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={pageTitles[page]}
          onSearch={page === 'messages' || page === 'contacts' ? undefined : (q) => setSearchQuery(q)}
          searchPlaceholder={`Search ${pageTitles[page].toLowerCase()}...`}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {page === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {page === 'messages' && <MessagesPage />}
          {page === 'stego' && <StegoPage />}
          {page === 'contacts' && <ContactsPage onMessageContact={handleMessageContact} />}
          {page === 'profile' && <ProfilePage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'activity' && <ActivityPage />}
          {page === 'help' && <HelpPage />}
        </main>
      </div>

      <ComposeModal
        open={showCompose}
        onClose={() => { setShowCompose(false); setComposeRecipient(null); }}
        onSent={() => {}}
        presetRecipient={composeRecipient}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
