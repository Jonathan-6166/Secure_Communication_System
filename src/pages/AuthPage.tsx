import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff, Moon, Sun, Image as ImageIcon, KeyRound, MessageSquare } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { resolved, toggle } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, displayName || email.split('@')[0]);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="min-h-screen flex bg-ink-50 dark:bg-ink-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-bold">CipherPix</p>
              <p className="text-xs text-white/70">Secure Steganography Messaging</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Hide your messages<br />in plain sight.
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            End-to-end encrypted messaging with image steganography. Your secrets live inside pixels — invisible to anyone but your intended recipient.
          </p>
          <div className="space-y-3 pt-4">
            {[
              { icon: Lock, title: 'AES-256-GCM Encryption', desc: 'Military-grade encryption before embedding' },
              { icon: ImageIcon, title: 'LSB Steganography', desc: 'Messages hidden in image pixel data' },
              { icon: MessageSquare, title: 'Secure Conversations', desc: 'Threaded messages with trusted contacts' },
              { icon: KeyRound, title: 'Client-side Keys', desc: 'Your passphrase never leaves your device' },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-white/70">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">© 2026 CipherPix. Your privacy, our priority.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-6">
          <button onClick={toggle} className="btn-ghost p-2.5" aria-label="Toggle theme">
            {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-ink-900 dark:text-ink-100">CipherPix</p>
                <p className="text-xs text-ink-400">Secure Stego Messaging</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
              {mode === 'login' ? 'Sign in to access your secure messages.' : 'Start sending hidden messages in minutes.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="input pl-10"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Spinner size="sm" /> : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm text-ink-500 dark:text-ink-400 mt-6">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
