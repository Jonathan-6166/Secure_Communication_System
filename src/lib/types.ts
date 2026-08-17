// Database types — mirror the Supabase schema

export type UserStatus = 'online' | 'offline' | 'away';
export type ContactStatus = 'pending' | 'accepted' | 'blocked';
export type EncryptionStatus = 'encrypted' | 'plaintext';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: UserStatus;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  owner_id: string;
  contact_id: string;
  status: ContactStatus;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  image_url: string | null;
  has_stego: boolean;
  encryption_status: EncryptionStatus;
  read_at: string | null;
  created_at: string;
}

export interface StegoRecord {
  id: string;
  user_id: string;
  operation: 'encode' | 'decode';
  message_length: number;
  image_url: string | null;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  ip: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  allow_messages_from: 'everyone' | 'contacts' | 'nobody';
  encryption_default: 'always' | 'optional';
  notify_new_messages: boolean;
  notify_security: boolean;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

// Derived view models
export interface ConversationPartner {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: UserStatus;
}

export interface Conversation {
  partner: ConversationPartner;
  lastMessage: Message;
  unreadCount: number;
}
