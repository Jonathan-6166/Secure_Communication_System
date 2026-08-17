import { useState, useEffect, useCallback } from 'react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getContactsWithProfiles } from '@/lib/queries';
import { encodeMessage, encryptText, fileToDataURL, formatBytes, getCapacity } from '@/lib/stego';
import type { ConversationPartner } from '@/lib/types';
import {
  Send, Image as ImageIcon, Lock, Upload, X, Eye, ShieldCheck,
  AlertTriangle, CheckCircle2, FileText, KeyRound,
} from 'lucide-react';

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  presetRecipient?: ConversationPartner | null;
}

export function ComposeModal({ open, onClose, onSent, presetRecipient }: ComposeModalProps) {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<{ profile: ConversationPartner }[]>([]);
  const [recipient, setRecipient] = useState<ConversationPartner | null>(presetRecipient ?? null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Steganography state
  const [useStego, setUseStego] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCapacity, setImageCapacity] = useState<number>(0);
  const [useEncryption, setUseEncryption] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [encoding, setEncoding] = useState(false);

  useEffect(() => {
    if (open) {
      setRecipient(presetRecipient ?? null);
      setSubject('');
      setBody('');
      setError(null);
      setUseStego(false);
      setImageFile(null);
      setImagePreview(null);
      setPassphrase('');
      // Load contacts
      if (user) {
        getContactsWithProfiles(user.id).then((list) => {
          setContacts(list.map((l) => ({ profile: l.profile })));
          setContactsLoading(false);
        });
      }
    }
  }, [open, user, presetRecipient]);

  const handleImageChange = async (file: File) => {
    setError(null);
    setImageFile(file);
    const url = await fileToDataURL(file);
    setImagePreview(url);
    // Check capacity
    const bitmap = await createImageBitmap(file);
    setImageCapacity(getCapacity(bitmap.width, bitmap.height));
    bitmap.close();
  };

  const handleSend = async () => {
    if (!user || !recipient) {
      setError('Please select a recipient.');
      return;
    }
    if (!body.trim() && !useStego) {
      setError('Message body cannot be empty.');
      return;
    }
    if (useStego && !imageFile) {
      setError('Please upload an image for steganography.');
      return;
    }
    if (useStego && useEncryption && !passphrase) {
      setError('Please enter an encryption passphrase.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      let messageBody = body;
      let hasStego = false;
      let encryptionStatus: 'encrypted' | 'plaintext' = 'plaintext';

      if (useStego && imageFile) {
        setEncoding(true);
        let payload = body;
        if (useEncryption) {
          const enc = await encryptText(body, passphrase);
          payload = JSON.stringify(enc);
          encryptionStatus = 'encrypted';
        }
        const result = await encodeMessage(imageFile, payload);
        // Upload encoded image to storage
        const fileName = `stego/${user.id}/${Date.now()}.png`;
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, result.blob, { contentType: 'image/png' });
        if (uploadErr) throw new Error('Failed to upload image: ' + uploadErr.message);
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
        hasStego = true;
        // Store a marker in body — the actual content is in the image
        messageBody = useEncryption ? '[Encrypted message hidden in image]' : '[Message hidden in image]';
        setEncoding(false);

        // Log stego history
        await supabase.from('stego_history').insert({
          user_id: user.id,
          operation: 'encode',
          message_length: result.payloadLength,
          image_url: imageUrl,
        });
      } else if (useEncryption && body) {
        // Encrypt the message body itself (without image)
        const enc = await encryptText(body, passphrase);
        messageBody = JSON.stringify(enc);
        encryptionStatus = 'encrypted';
      }

      // Insert message
      const { error: msgErr } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: recipient.id,
        subject: subject.trim(),
        body: messageBody,
        image_url: imageUrl,
        has_stego: hasStego,
        encryption_status: encryptionStatus,
      });
      if (msgErr) throw new Error('Failed to send message: ' + msgErr.message);

      // Create notification for recipient
      await supabase.from('notifications').insert({
        user_id: recipient.id,
        type: 'message',
        title: `New message from ${profile?.display_name ?? 'Someone'}`,
        body: subject.trim() || 'Click to view',
      });

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        event_type: 'message_sent',
        description: `Sent ${hasStego ? 'steganographic ' : ''}message to ${recipient.display_name}`,
      });

      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setEncoding(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Secure Message" size="lg">
      <div className="space-y-4">
        {/* Recipient */}
        <div>
          <label className="label">Recipient</label>
          {recipient ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800">
              <div className="flex items-center gap-3">
                <Avatar name={recipient.display_name} src={recipient.avatar_url} size="sm" status={recipient.status} />
                <div>
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">{recipient.display_name}</p>
                  <p className="text-xs text-ink-400">{recipient.status}</p>
                </div>
              </div>
              {!presetRecipient && (
                <button onClick={() => setRecipient(null)} className="btn-ghost p-1.5">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : contactsLoading ? (
            <div className="flex items-center gap-2 p-3"><Spinner size="sm" /> <span className="text-sm text-ink-400">Loading contacts...</span></div>
          ) : contacts.length === 0 ? (
            <Alert variant="warning" title="No contacts">
              You need to add contacts before sending messages. Go to the Contacts page to add one.
            </Alert>
          ) : (
            <select
              onChange={(e) => {
                const c = contacts.find((c) => c.profile.id === e.target.value);
                if (c) setRecipient(c.profile);
              }}
              className="input"
              defaultValue=""
            >
              <option value="" disabled>Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.profile.id} value={c.profile.id}>{c.profile.display_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="label">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject" className="input" />
        </div>

        {/* Body */}
        <div>
          <label className="label">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your secure message here..."
            rows={5}
            className="input resize-none"
          />
          <p className="text-xs text-ink-400 mt-1">{body.length} characters</p>
        </div>

        {/* Steganography options */}
        <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-brand-500" />
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">Steganography</p>
            <Badge variant="brand" className="ml-auto">LSB + AES-256</Badge>
          </div>
          <Toggle
            checked={useStego}
            onChange={setUseStego}
            label="Hide message in an image"
            description="Embed your message into image pixel data using LSB steganography"
          />

          {useStego && (
            <div className="space-y-3 pt-2 border-t border-ink-100 dark:border-ink-800">
              <label className="label">Cover Image</label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800">
                  <img src={imagePreview} alt="Cover" className="w-full max-h-48 object-contain bg-ink-50 dark:bg-ink-950" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 btn-secondary p-1.5 bg-white/90 dark:bg-ink-900/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-ink-950/70 text-white text-xs px-2 py-1 rounded-lg">
                    Capacity: {formatBytes(imageCapacity)}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-700 hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-ink-400" />
                  <p className="text-sm text-ink-500">Click to upload an image</p>
                  <p className="text-xs text-ink-400">PNG or JPEG, max 10MB</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  />
                </label>
              )}
              {imageFile && body.length > imageCapacity && (
                <Alert variant="error">
                  Message is {body.length} bytes but image can only hold {formatBytes(imageCapacity)}. Use a larger image or shorter message.
                </Alert>
              )}

              <Toggle
                checked={useEncryption}
                onChange={setUseEncryption}
                label="Encrypt before embedding"
                description="AES-256-GCM encryption with your passphrase"
              />

              {useEncryption && (
                <div>
                  <label className="label flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Passphrase</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Shared secret key"
                    className="input"
                  />
                  <p className="text-xs text-ink-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Your recipient needs this passphrase to decrypt the message.
                  </p>
                </div>
              )}
            </div>
          )}

          {!useStego && (
            <Toggle
              checked={useEncryption}
              onChange={setUseEncryption}
              label="Encrypt message body"
              description="Encrypt the text with AES-256-GCM before sending"
            />
          )}

          {!useStego && useEncryption && (
            <div>
              <label className="label flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Passphrase</label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Shared secret key"
                className="input"
              />
            </div>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Encryption status indicator */}
        <div className="flex items-center gap-2 text-xs">
          {useStego && useEncryption ? (
            <Badge variant="success"><ShieldCheck className="w-3 h-3" /> Steganographic + Encrypted</Badge>
          ) : useStego ? (
            <Badge variant="info"><ImageIcon className="w-3 h-3" /> Steganographic</Badge>
          ) : useEncryption ? (
            <Badge variant="success"><Lock className="w-3 h-3" /> Encrypted</Badge>
          ) : (
            <Badge variant="warning"><AlertTriangle className="w-3 h-3" /> Not encrypted</Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSend} disabled={loading || encoding} className="btn-primary">
            {encoding ? (
              <><Spinner size="sm" /> Encoding...</>
            ) : loading ? (
              <><Spinner size="sm" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send Message</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
