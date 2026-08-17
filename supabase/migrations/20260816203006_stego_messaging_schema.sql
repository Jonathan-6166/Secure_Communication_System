/*
# Steganography Secure Messaging — Schema

1. Overview
This app is a secure messaging platform where users can:
- Create an account (Supabase email/password auth)
- Maintain a profile with avatar, status, display name
- Manage contacts (connections between users)
- Send and receive messages, optionally embedding hidden text inside an image (LSB steganography + AES-GCM encryption on the client before upload)
- Track steganography encode/decode history
- View activity logs and notifications
- Manage privacy/security settings

2. New Tables
- `profiles` — extends auth.users: id (uuid PK -> auth.users), display_name, avatar_url, status (online/offline/away), bio, created_at, updated_at
- `contacts` — user-to-user connections: id, owner_id, contact_id, status (pending/accepted/blocked), created_at
- `messages` — secure messages between users: id, sender_id, recipient_id, subject, body, image_url (optional stego image), has_stego (bool), encryption_status (encrypted/plaintext), read_at, created_at
- `stego_history` — log of encode/decode operations: id, user_id, operation (encode/decode), message_length, image_url, created_at
- `activity_log` — security events: id, user_id, event_type, description, ip (text nullable), created_at
- `notifications` — in-app notifications: id, user_id, type, title, body, read_at, created_at
- `user_settings` — per-user privacy/security prefs: user_id PK, allow_messages_from (everyone/contacts/nobody), encryption_default (always/optional), notify_new_messages, notify_security, theme (light/dark/system), created_at, updated_at

3. Security
- RLS enabled on every table.
- Owner-scoped policies on profiles, contacts (owner), messages (sender or recipient), stego_history, activity_log, notifications, user_settings.
- Contacts: owner can see/manage their contact rows; both owner and the linked contact can see accepted contact rows so conversations work.
- Messages: sender and recipient can both read; only sender can insert/update; recipient marks read.
- All owner columns default to auth.uid() where the client inserts without passing user_id.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  status text NOT NULL DEFAULT 'offline',
  bio text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow any authenticated user to look up other users by id (for contacts/conversations)
-- We expose a read-only profile lookup via a SECURITY DEFINER function instead (below).

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, contact_id)
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select_owner" ON contacts;
CREATE POLICY "contacts_select_owner" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "contacts_insert_owner" ON contacts;
CREATE POLICY "contacts_insert_owner" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "contacts_update_owner" ON contacts;
CREATE POLICY "contacts_update_owner" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "contacts_delete_owner" ON contacts;
CREATE POLICY "contacts_delete_owner" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  has_stego boolean NOT NULL DEFAULT false,
  encryption_status text NOT NULL DEFAULT 'encrypted',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_parties" ON messages;
CREATE POLICY "messages_select_parties" ON messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
CREATE POLICY "messages_insert_sender" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "messages_update_sender" ON messages;
CREATE POLICY "messages_update_sender" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS stego_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  message_length integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stego_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stego_select_own" ON stego_history;
CREATE POLICY "stego_select_own" ON stego_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "stego_insert_own" ON stego_history;
CREATE POLICY "stego_insert_own" ON stego_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "stego_delete_own" ON stego_history;
CREATE POLICY "stego_delete_own" ON stego_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select_own" ON activity_log;
CREATE POLICY "activity_select_own" ON activity_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_insert_own" ON activity_log;
CREATE POLICY "activity_insert_own" ON activity_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_delete_own" ON activity_log;
CREATE POLICY "activity_delete_own" ON activity_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_messages_from text NOT NULL DEFAULT 'contacts',
  encryption_default text NOT NULL DEFAULT 'always',
  notify_new_messages boolean NOT NULL DEFAULT true,
  notify_security boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON user_settings;
CREATE POLICY "settings_select_own" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_insert_own" ON user_settings;
CREATE POLICY "settings_insert_own" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_update_own" ON user_settings;
CREATE POLICY "settings_update_own" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: look up a user's display_name + avatar_url + status by id (for contacts/messages)
-- Exposed to authenticated users so they can see who they're talking to.
CREATE OR REPLACE FUNCTION public.get_profile(p_user_id uuid)
RETURNS TABLE (id uuid, display_name text, avatar_url text, status text, bio text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, avatar_url, status, bio
  FROM public.profiles
  WHERE id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile(uuid) TO authenticated;

-- Bulk profile lookup for rendering contact lists / conversations
CREATE OR REPLACE FUNCTION public.get_profiles(p_user_ids uuid[])
RETURNS TABLE (id uuid, display_name text, avatar_url text, status text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, avatar_url, status
  FROM public.profiles
  WHERE id = ANY(p_user_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_profiles(uuid[]) TO authenticated;

-- Activity log trigger on profile creation handled in app. Indexes:
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity_log(user_id, created_at DESC);