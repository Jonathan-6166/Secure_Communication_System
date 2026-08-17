import { useState } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { decryptText, decodeMessage } from '@/lib/stego';
import type { Message, ConversationPartner } from '@/lib/types';
import {
  Lock, ShieldCheck, Image as ImageIcon, KeyRound, Eye, Download,
  AlertTriangle, CheckCircle2, FileText, Clock,
} from 'lucide-react';

interface MessageDetailProps {
  message: Message;
  partner: ConversationPartner;
  direction: 'inbox' | 'outbox';
  onDecrypt: (content: string) => void;
}

export function MessageDetail({ message, partner, direction, onDecrypt }: MessageDetailProps) {
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEncrypted = message.encryption_status === 'encrypted';

  const handleDecrypt = async () => {
    setDecoding(true);
    setError(null);
    try {
      if (message.has_stego && message.image_url) {
        // Fetch the image, decode, then decrypt
        const resp = await fetch(message.image_url);
        const blob = await resp.blob();
        const result = await decodeMessage(blob);
        // Try to parse as encrypted JSON
        try {
          const enc = JSON.parse(result.payload);
          if (enc.cipherB64 && enc.saltB64 && enc.ivB64) {
            const plaintext = await decryptText(enc, passphrase);
            setDecrypted(plaintext);
            onDecrypt(plaintext);
          } else {
            // Not encrypted, just embedded
            setDecrypted(result.payload);
            onDecrypt(result.payload);
          }
        } catch {
          // Not JSON — raw embedded message
          setDecrypted(result.payload);
          onDecrypt(result.payload);
        }
      } else if (isEncrypted) {
        // Encrypted body text
        const enc = JSON.parse(message.body);
        const plaintext = await decryptText(enc, passphrase);
        setDecrypted(plaintext);
        onDecrypt(plaintext);
      }
      setShowDecrypt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decrypt. Check your passphrase.');
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={partner.display_name} src={partner.avatar_url} size="md" status={partner.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink-900 dark:text-ink-100">{partner.display_name}</p>
            <Badge variant={direction === 'inbox' ? 'info' : 'brand'}>
              {direction === 'inbox' ? 'Received from' : 'Sent to'}
            </Badge>
          </div>
          <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {formatTime(message.created_at)}
          </p>
        </div>
      </div>

      {/* Subject */}
      {message.subject && (
        <div className="p-4 rounded-xl bg-ink-50 dark:bg-ink-800/50">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">Subject</p>
          <p className="text-sm font-medium text-ink-800 dark:text-ink-200">{message.subject}</p>
        </div>
      )}

      {/* Encryption status */}
      <div className="flex items-center gap-2 flex-wrap">
        {message.has_stego && <Badge variant="brand"><ImageIcon className="w-3 h-3" /> Steganographic</Badge>}
        {isEncrypted && <Badge variant="success"><Lock className="w-3 h-3" /> AES-256 Encrypted</Badge>}
        {!isEncrypted && !message.has_stego && <Badge variant="default"><FileText className="w-3 h-3" /> Plaintext</Badge>}
        {message.read_at && direction === 'inbox' && <Badge variant="default"><CheckCircle2 className="w-3 h-3" /> Read</Badge>}
      </div>

      {/* Stego image preview */}
      {message.has_stego && message.image_url && (
        <div className="rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800">
          <img src={message.image_url} alt="Steganographic image" className="w-full max-h-64 object-contain bg-ink-50 dark:bg-ink-950" />
        </div>
      )}

      {/* Message body */}
      <div className="p-4 rounded-xl border border-ink-200 dark:border-ink-800">
        {decrypted ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Decrypted message</p>
            </div>
            <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap break-words">{decrypted}</p>
          </div>
        ) : isEncrypted || message.has_stego ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
              {message.has_stego ? 'Message hidden in image' : 'Encrypted message'}
            </p>
            <p className="text-xs text-ink-400 mb-4">
              {message.has_stego
                ? 'Extract and decrypt the hidden message from the image above.'
                : 'Enter your shared passphrase to decrypt this message.'}
            </p>
            <button onClick={() => setShowDecrypt(true)} className="btn-primary">
              <KeyRound className="w-4 h-4" /> Decrypt message
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap break-words">{message.body}</p>
        )}
      </div>

      {/* Decrypt modal */}
      <Modal open={showDecrypt} onClose={() => setShowDecrypt(false)} title="Decrypt Message" size="sm">
        <div className="space-y-4">
          <Alert variant="info" title="Passphrase required">
            {message.has_stego
              ? 'The message will be extracted from the image and decrypted with your passphrase.'
              : 'Enter the shared passphrase to decrypt this message.'}
          </Alert>
          <div>
            <label className="label flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter shared secret key"
              className="input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDecrypt(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDecrypt} disabled={decoding || !passphrase} className="btn-primary">
              {decoding ? <><Spinner size="sm" /> Decrypting...</> : <><ShieldCheck className="w-4 h-4" /> Decrypt</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
