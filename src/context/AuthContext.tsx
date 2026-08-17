import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserSettings } from '@/lib/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    settings: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile:', error.message);
      return null;
    }
    return data as Profile | null;
  }, []);

  const loadSettings = useCallback(async (userId: string): Promise<UserSettings | null> => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load settings:', error.message);
      return null;
    }
    if (!data) {
      // Create default settings row
      const { data: created, error: insErr } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select()
        .maybeSingle();
      if (insErr) return null;
      return created as UserSettings;
    }
    return data as UserSettings;
  }, []);

  const ensureProfile = useCallback(async (user: User) => {
    const existing = await loadProfile(user.id);
    if (!existing) {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: user.email?.split('@')[0] ?? 'User',
          status: 'online',
        })
        .select()
        .maybeSingle();
      if (error) {
        console.error('Failed to create profile:', error.message);
        return null;
      }
      return data as Profile;
    }
    // Mark online
    if (existing.status !== 'online') {
      await supabase.from('profiles').update({ status: 'online', updated_at: new Date().toISOString() }).eq('id', user.id);
    }
    return existing;
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const [profile, settings] = await Promise.all([
          ensureProfile(session.user),
          loadSettings(session.user.id),
        ]);
        if (!mounted) return;
        setState({ user: session.user, session, profile, settings, loading: false });
      } else {
        setState({ user: null, session: null, profile: null, settings: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const [profile, settings] = await Promise.all([
            ensureProfile(session.user),
            loadSettings(session.user.id),
          ]);
          if (!mounted) return;
          setState({ user: session.user, session, profile, settings, loading: false });
        } else {
          if (!mounted) return;
          setState({ user: null, session: null, profile: null, settings: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [ensureProfile, loadSettings]);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Create profile immediately
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: displayName,
        status: 'online',
      });
      await supabase.from('user_settings').insert({ user_id: data.user.id });
      await supabase.from('activity_log').insert({
        user_id: data.user.id,
        event_type: 'signup',
        description: 'Account created',
      });
    }
    return { error: null };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('activity_log').insert({
        user_id: data.user.id,
        event_type: 'login',
        description: 'Signed in successfully',
      });
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (state.user) {
      await supabase.from('profiles').update({ status: 'offline', updated_at: new Date().toISOString() }).eq('id', state.user.id);
      await supabase.from('activity_log').insert({
        user_id: state.user.id,
        event_type: 'logout',
        description: 'Signed out',
      });
    }
    await supabase.auth.signOut();
  }, [state.user]);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    if (profile) setState((s) => ({ ...s, profile }));
  }, [state.user, loadProfile]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(async (patch) => {
    if (!state.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', state.user.id);
    if (error) throw error;
    setState((s) => ({ ...s, profile: s.profile ? { ...s.profile, ...patch } : s.profile }));
  }, [state.user]);

  const updateSettings = useCallback<AuthContextValue['updateSettings']>(async (patch) => {
    if (!state.user) return;
    const { error } = await supabase
      .from('user_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', state.user.id);
    if (error) throw error;
    setState((s) => ({ ...s, settings: s.settings ? { ...s.settings, ...patch } : s.settings }));
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile, updateProfile, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
