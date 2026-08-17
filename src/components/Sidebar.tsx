import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  LayoutDashboard, MessageSquare, Image as ImageIcon, Users,
  Settings, LogOut, ShieldCheck, Moon, Sun, ChevronLeft, ChevronRight,
} from 'lucide-react';

export type Page =
  | 'dashboard' | 'messages' | 'stego' | 'contacts'
  | 'profile' | 'settings' | 'activity' | 'help';

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadMessages: number;
  onSignOut: () => void;
}

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'stego', label: 'Steganography', icon: ImageIcon },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'profile', label: 'Profile', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ page, onNavigate, collapsed, onToggleCollapse, unreadMessages, onSignOut }: SidebarProps) {
  const { profile } = useAuth();
  const { resolved, toggle } = useTheme();

  return (
    <aside
      className={cn(
        'flex flex-col bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-ink-800 transition-all duration-300 shrink-0',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-200 dark:border-ink-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0 shadow-glow">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-ink-900 dark:text-ink-100 leading-none">CipherPix</p>
            <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">Secure Stego Messaging</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn('nav-item w-full', active && 'nav-item-active', collapsed && 'justify-center px-0')}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.id === 'messages' && unreadMessages > 0 && (
                <Badge variant="brand" className="px-2 py-0.5">{unreadMessages}</Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-ink-200 dark:border-ink-800 space-y-1">
        <button
          onClick={toggle}
          className={cn('nav-item w-full', collapsed && 'justify-center px-0')}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span>Toggle theme</span>}
        </button>
        <button
          onClick={onSignOut}
          className={cn('nav-item w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30', collapsed && 'justify-center px-0')}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center h-10 border-t border-ink-200 dark:border-ink-800 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      {/* User card */}
      {!collapsed && profile && (
        <div className="flex items-center gap-3 p-4 border-t border-ink-200 dark:border-ink-800">
          <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" status={profile.status} />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-200 truncate">{profile.display_name}</p>
            <p className="text-xs text-ink-400 truncate">Online</p>
          </div>
        </div>
      )}
    </aside>
  );
}
