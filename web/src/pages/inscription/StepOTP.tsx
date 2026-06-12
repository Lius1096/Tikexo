import React, { useRef, useState } from 'react';

interface Props {
  telephone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  loading: boolean;
  erreur: string | null;
}

export default function StepOTP({ telephone, onVerify, onResend, loading, erreur }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(idx: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (d && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every((v) => v)) onVerify(next.join(''));
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="full-card">
      <div className="mnav">
        <span className="mnav-logo">TIKEXO</span>
        <div></div>
      </div>
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#DBEAFE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <i className="ti ti-device-mobile" style={{ fontSize: '22px', color: '#185FA5' }} aria-hidden="true"></i>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#1E293B', marginBottom: '6px' }}>Vérifiez votre numéro</div>
        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.7, marginBottom: '24px' }}>
          Un code OTP à 6 chiffres a été envoyé au<br />
          <strong style={{ color: '#1A3C5E' }}>{telephone}</strong>
        </div>

        <div className="otp-wrap">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              className="otp-digit"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
            />
          ))}
        </div>

        {erreur && (
          <div className="alert-error" style={{ marginBottom: '12px', textAlign: 'left' }}>
            <i className="ti ti-alert-circle" aria-hidden="true"></i> {erreur}
          </div>
        )}

        {loading && (
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
            <i className="ti ti-loader-2" aria-hidden="true"></i> Vérification en cours…
          </div>
        )}

        <button
          onClick={onResend}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: '#0EA5E9', fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
        >
          Renvoyer le code
        </button>
      </div>
    </div>
  );
}
