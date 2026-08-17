import { supabase } from '@/lib/supabase';
import type { ConversationPartner, Contact } from '@/lib/types';

// Look up a single profile by user ID via SECURITY DEFINER function
export async function getProfile(userId: string): Promise<ConversationPartner | null> {
  const { data, error } = await supabase.rpc('get_profile', { p_user_id: userId });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    status: row.status as ConversationPartner['status'],
  };
}

// Bulk lookup profiles by IDs (deduplicates first)
export async function getProfiles(userIds: string[]): Promise<Map<string, ConversationPartner>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc('get_profiles', { p_user_ids: unique });
  if (error || !data) return new Map();
  const map = new Map<string, ConversationPartner>();
  for (const row of data) {
    map.set(row.id, {
      id: row.id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      status: row.status as ConversationPartner['status'],
    });
  }
  return map;
}

// Get accepted contacts for the current user with their profiles
export async function getContactsWithProfiles(ownerId: string): Promise<{ contact: Contact; profile: ConversationPartner }[]> {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error || !contacts) return [];
  const accepted = contacts.filter((c) => c.status === 'accepted') as Contact[];
  const profileMap = await getProfiles(accepted.map((c) => c.contact_id));
  return accepted
    .map((contact) => {
      const profile = profileMap.get(contact.contact_id);
      return profile ? { contact, profile } : null;
    })
    .filter((x): x is { contact: Contact; profile: ConversationPartner } => x !== null);
}

// Find a user by display name (for adding contacts) — uses SECURITY DEFINER search function
export async function findUserByEmail(displayName: string): Promise<ConversationPartner | null> {
  const { data, error } = await supabase.rpc('search_profiles', { p_query: displayName });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    status: row.status as ConversationPartner['status'],
  };
}
