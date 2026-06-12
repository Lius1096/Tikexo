import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Send, ArrowLeft, Clock, Delete } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth, ROLES_ADMIN, ROLES_EMPLOYEUR } from '../context/AuthContext';

type Step = 'phone' | 'otp';

export default function Login() {
  const { requestOtp, verifierOtp, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) redirectUser(user.role);
  }, [isAuthenticated, user]);

  function redirectUser(role: string) {
    if (['SUPER_ADMIN', 'ADMIN_OPS'].includes(role)) { window.location.href = '/admin'; return; }
    if (ROLES_EMPLOYEUR.includes(role)) { window.location.href = '/employeur'; return; }
    if (role === 'BENEFICIAIRE') { window.location.href = '/beneficiaire'; return; }
    if (role === 'COMMERCANT') { window.location.href = '/commercant'; return; }
    setLoading(false);
    setError('Accès non autorisé.');
  }

  function startCountdown() {
    setCountdown(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handleRequestOtp() {
    if (phone.replace(/\s/g, '').length < 8) { setError('Entrez un numéro valide — ex : 01 97 45 23 10'); return; }
    setError('');
    setLoading(true);
    try {
      await requestOtp(`+229${phone.replace(/\s/g, '')}`);
      setStep('otp');
      startCountdown();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Impossible d\'envoyer le code. Vérifiez votre numéro.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(codeParam?: string) {
    const code = codeParam ?? digits.join('');
    if (code.length < 6) { setError('Entrez les 6 chiffres du code.'); return; }
    setError('');
    setLoading(true);
    try {
      const u = await verifierOtp(`+229${phone.replace(/\s/g, '')}`, code);
      redirectUser(u.role);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Code incorrect ou expiré.');
      setDigits(['', '', '', '', '', '']);
      setLoading(false);
    }
  }

  function handleKeyPress(key: string) {
    if (key === 'del') {
      const idx = digits.findLastIndex((d) => d !== '');
      if (idx >= 0) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      }
      return;
    }
    const idx = digits.findIndex((d) => d === '');
    if (idx >= 0) {
      const next = [...digits];
      next[idx] = key;
      setDigits(next);
      if (idx === 5) setTimeout(() => handleVerifyOtp(next.join('')), 50);
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-tikexo-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* Hero */}
        <div className="bg-tikexo-primary px-6 py-8 flex flex-col items-center">
          <div className="text-2xl font-medium text-white tracking-[3px] mb-1">TIKEXO</div>
          <div className="text-[11px] text-white/50 tracking-[1px] mb-6">TON REPAS, TON DROIT</div>
          <div className="w-16 h-16 bg-tikexo-accent/20 rounded-[20px] flex items-center justify-center">
            <Wallet size={32} className="text-tikexo-accent" />
          </div>
        </div>

        {step === 'phone' ? (
          <div className="px-6 py-6">
            <div className="text-base font-medium text-slate-900 mb-1">Bienvenue</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-5">
              Entrez votre numéro de téléphone pour recevoir un code de connexion.
            </div>

            <div className="mb-4">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">NUMÉRO DE TÉLÉPHONE</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus-within:border-tikexo-accent focus-within:bg-white transition-colors">
                <span className="text-xs text-slate-500 font-mono flex-shrink-0">+229</span>
                <input
                  type="tel"
                  className="flex-1 bg-transparent text-sm font-mono text-slate-900 outline-none placeholder-slate-400"
                  placeholder="01 97 45 23 10"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  maxLength={14}
                  autoFocus
                />
              </div>
            </div>

            {error && <div className="text-[11px] text-tikexo-danger mb-3">{error}</div>}

            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full bg-tikexo-primary text-white rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-tikexo-accent transition-colors disabled:opacity-60"
            >
              <Send size={16} />
              {loading ? 'Envoi en cours…' : 'Recevoir mon code'}
            </button>

            <div className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
              En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité TIKEXO.
            </div>
          </div>
        ) : (
          <div>
            {/* OTP hero */}
            <div className="bg-tikexo-primary px-5 py-4">
              <button
                onClick={() => { setStep('phone'); setDigits(['', '', '', '', '', '']); setError(''); }}
                className="flex items-center gap-1.5 mb-4"
              >
                <ArrowLeft size={16} className="text-white/60" />
                <span className="text-xs text-white/60">Retour</span>
              </button>
              <div className="text-[15px] font-medium text-white mb-1">Code de vérification</div>
              <div className="text-[11px] text-white/55">Code envoyé par SMS au</div>
              <div className="font-mono text-sm text-tikexo-accent mt-0.5">+229 {phone}</div>
            </div>

            <div className="px-5 py-5">
              {/* Digits */}
              <div className="flex gap-2 justify-center mb-4">
                {digits.map((d, i) => {
                  const filled = d !== '';
                  const active = !filled && digits.slice(0, i).every((x) => x !== '');
                  const done = digits.every((x) => x !== '');
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'w-9 h-11 rounded-lg border flex items-center justify-center font-mono text-xl font-medium transition-colors',
                        done ? 'border-tikexo-success bg-[#EAF3DE] text-tikexo-success' :
                        active ? 'border-tikexo-accent border-2' :
                        filled ? 'border-tikexo-primary bg-white text-slate-900' :
                        'border-slate-200 bg-slate-50 text-slate-900'
                      )}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mb-4">
                <Clock size={13} />
                {countdown > 0 ? (
                  <span>Renvoyer le code dans <span className="font-mono text-tikexo-accent">{fmt(countdown)}</span></span>
                ) : (
                  <button onClick={async () => { await requestOtp(`+229${phone}`); startCountdown(); }} className="text-tikexo-accent font-medium">
                    Renvoyer le code
                  </button>
                )}
              </div>

              {error && <div className="text-[11px] text-tikexo-danger mb-3 text-center">{error}</div>}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-1.5">
                {['1','2','3','4','5','6','7','8','9','','0','del'].map((k) => (
                  <button
                    key={k}
                    disabled={loading || k === ''}
                    onClick={() => k !== '' && handleKeyPress(k)}
                    className={clsx(
                      'h-11 rounded-lg border text-base font-medium font-mono flex items-center justify-center transition-colors',
                      k === '' ? 'bg-transparent border-transparent' :
                      'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 active:bg-slate-200'
                    )}
                  >
                    {k === 'del' ? <Delete size={18} className="text-slate-500" /> : k}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-center text-xs text-slate-500 mt-3">Vérification en cours…</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-white/30 mt-6 text-center">
        TIKEXO · tikexo.bj · Portail Administration
      </div>
    </div>
  );
}
