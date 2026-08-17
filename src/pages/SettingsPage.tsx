import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Toggle, Segmented } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
  Shield, Lock, Bell, Moon, Sun, Monitor, Mail, Settings as SettingsIcon,
  CheckCircle2, Eye, KeyRound, AlertTriangle,
} from 'lucide-react';

export function SettingsPage() {
  const { user, settings, updateSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!settings) return <div className="flex items-center justify-center h-full"><Spinner /></div>;

  const handleUpdate = async (patch: Parameters<typeof updateSettings>[0]) => {
    setSaving(true);
    try {
      await updateSettings(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Settings</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Manage your privacy, security, and preferences.</p>
      </div>

      {saved && <Alert variant="success"><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Settings saved.</span></Alert>}

      {/* Privacy */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Privacy</h3>
        </div>

        <div>
          <label className="label flex items-center gap-1.5 mb-2"><Mail className="w-3 h-3" /> Who can send you messages?</label>
          <Segmented
            value={settings.allow_messages_from}
            onChange={(v) => handleUpdate({ allow_messages_from: v })}
            options={[
              { value: 'everyone', label: 'Everyone' },
              { value: 'contacts', label: 'Contacts only' },
              { value: 'nobody', label: 'No one' },
            ]}
          />
          <p className="text-xs text-ink-400 mt-2">Controls who can start new conversations with you.</p>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Security</h3>
          <Badge variant="success" className="ml-auto"><Shield className="w-3 h-3" /> Protected</Badge>
        </div>

        <div>
          <label className="label flex items-center gap-1.5 mb-2"><KeyRound className="w-3 h-3" /> Default encryption</label>
          <Segmented
            value={settings.encryption_default}
            onChange={(v) => handleUpdate({ encryption_default: v })}
            options={[
              { value: 'always', label: 'Always encrypt' },
              { value: 'optional', label: 'Optional' },
            ]}
          />
          <p className="text-xs text-ink-400 mt-2">When set to "Always", all new messages are encrypted by default.</p>
        </div>

        <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-300">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Security tips
          </div>
          <ul className="text-xs text-ink-500 dark:text-ink-400 space-y-1.5 list-disc pl-4">
            <li>Use a strong, unique passphrase for each contact.</li>
            <li>Share passphrases through a separate, secure channel.</li>
            <li>Steganographic images look identical to the original — verify via the decode tool.</li>
            <li>Your encryption keys never leave your device.</li>
          </ul>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Notifications</h3>
        </div>

        <Toggle
          checked={settings.notify_new_messages}
          onChange={(v) => handleUpdate({ notify_new_messages: v })}
          label="New message notifications"
          description="Get notified when you receive a new message"
        />
        <Toggle
          checked={settings.notify_security}
          onChange={(v) => handleUpdate({ notify_security: v })}
          label="Security alerts"
          description="Get notified about login activity and security events"
        />
      </div>

      {/* Appearance */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Appearance</h3>
        </div>

        <div>
          <label className="label mb-2">Theme</label>
          <div className="flex gap-3">
            {([
              { value: 'light' as const, label: 'Light', icon: Sun },
              { value: 'dark' as const, label: 'Dark', icon: Moon },
              { value: 'system' as const, label: 'System', icon: Monitor },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); handleUpdate({ theme: opt.value }); }}
                className={cn(
                  'flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all flex-1',
                  theme === opt.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                    : 'border-ink-200 dark:border-ink-700 text-ink-500 hover:border-ink-300 dark:hover:border-ink-600',
                )}
              >
                <opt.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {saving && <p className="text-xs text-ink-400 text-center flex items-center justify-center gap-2"><Spinner size="sm" /> Saving...</p>}
    </div>
  );
}
