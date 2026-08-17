import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, formatTime, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented, Toggle } from '@/components/ui/Toggle';
import {
  encodeMessage, decodeMessage, encryptText, decryptText,
  fileToDataURL, downloadBlob, formatBytes, getCapacity,
} from '@/lib/stego';
import type { StegoRecord } from '@/lib/types';
import {
  Upload, Download, Image as ImageIcon, Lock, ShieldCheck, KeyRound,
  Eye, EyeOff, FileText, History, CheckCircle2, AlertTriangle,
  ArrowDownToLine, ArrowUpFromLine, Trash2, Clock,
} from 'lucide-react';

type ToolTab = 'encode' | 'decode' | 'history';

export function StegoPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ToolTab>('encode');

  // Encode state
  const [encImage, setEncImage] = useState<File | null>(null);
  const [encPreview, setEncPreview] = useState<string | null>(null);
  const [encMessage, setEncMessage] = useState('');
  const [encCapacity, setEncCapacity] = useState(0);
  const [encUseCrypto, setEncUseCrypto] = useState(true);
  const [encPassphrase, setEncPassphrase] = useState('');
  const [encoding, setEncoding] = useState(false);
  const [encResult, setEncResult] = useState<{ url: string; size: number } | null>(null);
  const [encError, setEncError] = useState<string | null>(null);

  // Decode state
  const [decImage, setDecImage] = useState<File | null>(null);
  const [decPreview, setDecPreview] = useState<string | null>(null);
  const [decPassphrase, setDecPassphrase] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [decResult, setDecResult] = useState<string | null>(null);
  const [decError, setDecError] = useState<string | null>(null);
  const [decIsEncrypted, setDecIsEncrypted] = useState(false);

  // History
  const [history, setHistory] = useState<StegoRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('stego_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setHistory((data ?? []) as StegoRecord[]);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Encode handlers
  const handleEncImage = async (file: File) => {
    setEncError(null);
    setEncResult(null);
    setEncImage(file);
    const url = await fileToDataURL(file);
    setEncPreview(url);
    const bitmap = await createImageBitmap(file);
    setEncCapacity(getCapacity(bitmap.width, bitmap.height));
    bitmap.close();
  };

  const handleEncode = async () => {
    if (!encImage || !encMessage) return;
    if (encUseCrypto && !encPassphrase) {
      setEncError('Please enter an encryption passphrase.');
      return;
    }
    setEncoding(true);
    setEncError(null);
    try {
      let payload = encMessage;
      if (encUseCrypto) {
        const enc = await encryptText(encMessage, encPassphrase);
        payload = JSON.stringify(enc);
      }
      const result = await encodeMessage(encImage, payload);
      const url = URL.createObjectURL(result.blob);
      setEncResult({ url, size: result.blob.size });

      // Log to history
      await supabase.from('stego_history').insert({
        user_id: user!.id,
        operation: 'encode',
        message_length: result.payloadLength,
      });
      await supabase.from('activity_log').insert({
        user_id: user!.id,
        event_type: 'stego_encode',
        description: 'Encoded a steganographic message',
      });
      loadHistory();
    } catch (err) {
      setEncError(err instanceof Error ? err.message : 'Failed to encode message');
    } finally {
      setEncoding(false);
    }
  };

  // Decode handlers
  const handleDecImage = async (file: File) => {
    setDecError(null);
    setDecResult(null);
    setDecImage(file);
    const url = await fileToDataURL(file);
    setDecPreview(url);
  };

  const handleDecode = async () => {
    if (!decImage) return;
    setDecoding(true);
    setDecError(null);
    setDecResult(null);
    try {
      const result = await decodeMessage(decImage);
      // Try to parse as encrypted JSON
      try {
        const enc = JSON.parse(result.payload);
        if (enc.cipherB64 && enc.saltB64 && enc.ivB64) {
          setDecIsEncrypted(true);
          if (!decPassphrase) {
            setDecError('This message is encrypted. Enter a passphrase to decrypt it.');
            setDecoding(false);
            return;
          }
          const plaintext = await decryptText(enc, decPassphrase);
          setDecResult(plaintext);
        } else {
          setDecResult(result.payload);
        }
      } catch {
        // Raw payload, not JSON
        setDecIsEncrypted(false);
        setDecResult(result.payload);
      }

      // Log to history
      await supabase.from('stego_history').insert({
        user_id: user!.id,
        operation: 'decode',
        message_length: result.length,
      });
      await supabase.from('activity_log').insert({
        user_id: user!.id,
        event_type: 'stego_decode',
        description: 'Decoded a steganographic message',
      });
      loadHistory();
    } catch (err) {
      setDecError(err instanceof Error ? err.message : 'Failed to decode image');
    } finally {
      setDecoding(false);
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    await supabase.from('stego_history').delete().eq('id', id);
    loadHistory();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Steganography Tools</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Hide and extract secret messages from images using LSB encoding.</p>
        </div>
        <Badge variant="brand" className="px-3 py-1.5"><ShieldCheck className="w-3.5 h-3.5" /> AES-256 + LSB</Badge>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'encode', label: 'Encode' },
          { value: 'decode', label: 'Decode' },
          { value: 'history', label: 'History' },
        ]}
      />

      {/* ENCODE */}
      {tab === 'encode' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Hide a Message</h3>
            </div>

            {/* Image upload */}
            <div>
              <label className="label">Cover Image</label>
              {encPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800">
                  <img src={encPreview} alt="Cover" className="w-full max-h-48 object-contain bg-ink-50 dark:bg-ink-950" />
                  <button onClick={() => { setEncImage(null); setEncPreview(null); setEncResult(null); }} className="absolute top-2 right-2 btn-secondary p-1.5 bg-white/90 dark:bg-ink-900/90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-700 hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-ink-400" />
                  <p className="text-sm text-ink-500">Upload cover image</p>
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleEncImage(e.target.files[0])} />
                </label>
              )}
              {encImage && (
                <p className="text-xs text-ink-400 mt-1.5">
                  Capacity: <span className="font-semibold text-brand-600 dark:text-brand-400">{formatBytes(encCapacity)}</span> of hidden data
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="label">Secret Message</label>
              <textarea
                value={encMessage}
                onChange={(e) => setEncMessage(e.target.value)}
                placeholder="Enter the message to hide in the image..."
                rows={5}
                className="input resize-none"
              />
              <p className="text-xs text-ink-400 mt-1">{encMessage.length} bytes {encImage && encMessage.length > encCapacity && <span className="text-red-500 font-semibold">— exceeds capacity!</span>}</p>
            </div>

            {/* Encryption */}
            <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 space-y-3">
              <Toggle checked={encUseCrypto} onChange={setEncUseCrypto} label="Encrypt before embedding" description="AES-256-GCM with your passphrase" />
              {encUseCrypto && (
                <div>
                  <label className="label flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Passphrase</label>
                  <input type="password" value={encPassphrase} onChange={(e) => setEncPassphrase(e.target.value)} placeholder="Shared secret key" className="input" />
                </div>
              )}
            </div>

            {encError && <Alert variant="error">{encError}</Alert>}

            <button onClick={handleEncode} disabled={encoding || !encImage || !encMessage || (encUseCrypto && !encPassphrase) || (encImage && encMessage.length > encCapacity)} className="btn-primary w-full">
              {encoding ? <><Spinner size="sm" /> Encoding...</> : <><Lock className="w-4 h-4" /> Encode Message</>}
            </button>
          </div>

          {/* Output */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Encoded Result</h3>
            </div>
            {encResult ? (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800">
                  <img src={encResult.url} alt="Encoded" className="w-full max-h-64 object-contain bg-ink-50 dark:bg-ink-950" />
                </div>
                <Alert variant="success" title="Message encoded successfully">
                  Your message has been hidden in the image. Download and share it with your recipient.
                  {encUseCrypto && ' They will need your passphrase to decrypt it.'}
                </Alert>
                <div className="flex gap-3">
                  <a href={encResult.url} download="stego-encoded.png" className="btn-primary flex-1">
                    <Download className="w-4 h-4" /> Download PNG
                  </a>
                </div>
                <p className="text-xs text-ink-400">File size: {formatBytes(encResult.size)}</p>
              </div>
            ) : (
              <EmptyState icon={<ImageIcon className="w-6 h-6" />} title="No encoded image yet" description="Upload an image and enter a message, then click Encode." />
            )}
          </div>
        </div>
      )}

      {/* DECODE */}
      {tab === 'decode' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Extract a Message</h3>
            </div>

            <div>
              <label className="label">Image with Hidden Message</label>
              {decPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800">
                  <img src={decPreview} alt="To decode" className="w-full max-h-48 object-contain bg-ink-50 dark:bg-ink-950" />
                  <button onClick={() => { setDecImage(null); setDecPreview(null); setDecResult(null); }} className="absolute top-2 right-2 btn-secondary p-1.5 bg-white/90 dark:bg-ink-900/90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-700 hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-ink-400" />
                  <p className="text-sm text-ink-500">Upload image to decode</p>
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleDecImage(e.target.files[0])} />
                </label>
              )}
            </div>

            <div>
              <label className="label flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Decryption Passphrase (if encrypted)</label>
              <input type="password" value={decPassphrase} onChange={(e) => setDecPassphrase(e.target.value)} placeholder="Enter passphrase if the message is encrypted" className="input" />
            </div>

            {decError && <Alert variant="error">{decError}</Alert>}

            <button onClick={handleDecode} disabled={decoding || !decImage} className="btn-primary w-full">
              {decoding ? <><Spinner size="sm" /> Decoding...</> : <><Eye className="w-4 h-4" /> Extract Message</>}
            </button>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-ink-900 dark:text-ink-100">Extracted Message</h3>
            </div>
            {decResult !== null ? (
              <div className="space-y-4">
                <Alert variant="success">
                  {decIsEncrypted ? 'Message decrypted successfully.' : 'Message extracted (not encrypted).'}
                </Alert>
                <div className="p-4 rounded-xl bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-800">
                  <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap break-words font-mono">{decResult}</p>
                </div>
              </div>
            ) : (
              <EmptyState icon={<EyeOff className="w-6 h-6" />} title="No message extracted yet" description="Upload an image with a hidden message and click Extract." />
            )}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-ink-900 dark:text-ink-100">Steganography History</h3>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : history.length === 0 ? (
            <EmptyState icon={<History className="w-6 h-6" />} title="No history yet" description="Your encode and decode operations will be tracked here." />
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors border border-ink-100 dark:border-ink-800/50">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', h.operation === 'encode' ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400')}>
                    {h.operation === 'encode' ? <ArrowUpFromLine className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-200 capitalize">{h.operation} operation</p>
                    <p className="text-xs text-ink-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatTime(h.created_at)} · {h.message_length} bytes
                    </p>
                  </div>
                  {h.image_url && (
                    <a href={h.image_url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2">
                      <ImageIcon className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => deleteHistoryRecord(h.id)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
