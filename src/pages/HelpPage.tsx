import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import {
  HelpCircle, ShieldCheck, Lock, Image as ImageIcon, KeyRound,
  MessageSquare, BookOpen, ChevronDown, LifeBuoy, Mail, ExternalLink,
} from 'lucide-react';

const faqs = [
  {
    q: 'What is steganography?',
    a: 'Steganography is the practice of hiding information within another medium — in this case, hiding text messages inside the pixel data of an image. Unlike encryption, which makes data unreadable, steganography makes data invisible. The image looks completely normal to anyone who sees it.',
  },
  {
    q: 'How does CipherPix hide messages?',
    a: 'We use LSB (Least Significant Bit) encoding: each pixel in the image has red, green, and blue values, and we modify the least significant bit of each to encode your message. This creates changes so subtle they are invisible to the human eye. Optionally, your message is first encrypted with AES-256-GCM before being embedded.',
  },
  {
    q: 'What is AES-256-GCM encryption?',
    a: 'AES-256-GCM is a military-grade encryption standard. It encrypts your message so that even if someone extracts the hidden data from an image, they cannot read it without your passphrase. GCM mode also ensures the message has not been tampered with.',
  },
  {
    q: 'Do I need to share my passphrase?',
    a: 'Yes — your recipient needs the same passphrase to decrypt an encrypted message. Share passphrases through a different secure channel (in person, by phone, etc.). CipherPix never stores or transmits your passphrase.',
  },
  {
    q: 'Can people tell an image contains a hidden message?',
    a: 'To the human eye, the encoded image looks identical to the original. Statistical analysis could theoretically detect the embedding, which is why we recommend combining steganography with encryption — even if detected, the content remains unreadable without the passphrase.',
  },
  {
    q: 'What happens if I lose my passphrase?',
    a: 'There is no way to recover an encrypted message without the correct passphrase. This is by design — your security depends on no one, including us, being able to access your messages without the key.',
  },
];

const features = [
  { icon: Lock, title: 'AES-256-GCM Encryption', desc: 'Military-grade encryption for your messages before they are hidden.' },
  { icon: ImageIcon, title: 'LSB Steganography', desc: 'Messages embedded in image pixels, invisible to the naked eye.' },
  { icon: KeyRound, title: 'Client-side Keys', desc: 'Your passphrases never leave your device or touch our servers.' },
  { icon: ShieldCheck, title: 'End-to-end Security', desc: 'From composition to delivery, your messages stay protected.' },
];

export function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Help & Support</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Learn how CipherPix keeps your communications secure.</p>
      </div>

      {/* Features overview */}
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className="card p-5">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3">
              <f.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-sm text-ink-800 dark:text-ink-200">{f.title}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">How It Works</h3>
        </div>
        <div className="space-y-4">
          {[
            { step: 1, title: 'Compose your message', desc: 'Write your secret message and optionally add a subject line.' },
            { step: 2, title: 'Choose your cover image', desc: 'Upload any PNG or JPEG image to serve as the container for your message.' },
            { step: 3, title: 'Encrypt (recommended)', desc: 'Enter a passphrase to encrypt your message with AES-256-GCM before embedding.' },
            { step: 4, title: 'Encode & send', desc: 'Your message is embedded into the image pixels and sent to your contact.' },
            { step: 5, title: 'Recipient decodes', desc: 'Your contact uploads the image, enters the passphrase, and reads the hidden message.' },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {s.step}
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">{s.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Frequently Asked Questions</h3>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-ink-800 dark:text-ink-200">{faq.q}</span>
                <ChevronDown className={cn('w-4 h-4 text-ink-400 shrink-0 transition-transform', openIdx === i && 'rotate-180')} />
              </button>
              {openIdx === i && (
                <div className="px-4 pb-4 text-sm text-ink-500 dark:text-ink-400 animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support contact */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-ink-900 dark:text-ink-100">Need More Help?</h3>
        </div>
        <Alert variant="info">
          <p className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Contact our support team at
            <span className="font-semibold text-brand-600 dark:text-brand-400">support@cipherpix.app</span>
          </p>
        </Alert>
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="brand"><MessageSquare className="w-3 h-3" /> 24/7 Support</Badge>
          <Badge variant="success"><ShieldCheck className="w-3 h-3" /> Privacy First</Badge>
        </div>
      </div>

      <p className="text-center text-xs text-ink-400 pb-6">
        CipherPix v1.0 · Built with security and privacy at the core.
      </p>
    </div>
  );
}
