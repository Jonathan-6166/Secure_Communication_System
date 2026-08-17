import { useState, useRef } from 'react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Segmented } from '@/components/ui/Toggle';
import type { UserStatus } from '@/lib/types';
import {
  Camera, Save, ShieldCheck, Mail, Calendar, User, Edit3,
  CheckCircle2, Clock,
} from 'lucide-react';

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [status, setStatus] = useState<UserStatus>(profile?.status ?? 'online');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const fileName = `avatars/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
      await updateProfile({ avatar_url: urlData.publicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ display_name: displayName, bio, status });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Your Profile</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Manage how others see you in CipherPix.</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative">
            <Avatar name={displayName || profile.display_name} src={profile.avatar_url} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-soft hover:bg-brand-600 transition-colors"
              disabled={uploading}
            >
              {uploading ? <Spinner size="sm" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100">{profile.display_name}</h3>
            <p className="text-sm text-ink-400 flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={profile.status === 'online' ? 'success' : profile.status === 'away' ? 'warning' : 'default'}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> {profile.status}
              </Badge>
              <Badge variant="brand"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Edit Profile</h3>
        </div>

        <div>
          <label className="label flex items-center gap-1.5"><User className="w-3 h-3" /> Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell your contacts about yourself..." className="input resize-none" />
        </div>

        <div>
          <label className="label">Status</label>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'online', label: 'Online' },
              { value: 'away', label: 'Away' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {saved && <Alert variant="success"><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Profile saved successfully.</span></Alert>}

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />} Save Changes
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h3 className="font-semibold text-ink-900 dark:text-ink-100 mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-ink-100 dark:border-ink-800/50">
            <span className="text-sm text-ink-500 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
            <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-ink-100 dark:border-ink-800/50">
            <span className="text-sm text-ink-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Member since</span>
            <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-ink-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Last updated</span>
            <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{new Date(profile.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
