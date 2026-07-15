import React from 'react';

// ─── Logo SVG hexagone Tikexo ─────────────────────────────────────────────────
function LogoTikexo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <path d="M13 1.5L24 7.5V18.5L13 24.5L2 18.5V7.5L13 1.5Z"
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      <path d="M8.5 9.5L13 13L8.5 16.5"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 9.5L18 13L13.5 16.5"
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── QR Code SVG statique (placeholder visuel) ───────────────────────────────
function QRPlaceholder() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <rect width="50" height="50" fill="white" />
      <rect x="3"  y="3"  width="18" height="18" rx="2" fill="none" stroke="#1A3B8C" strokeWidth="1.5" />
      <rect x="6"  y="6"  width="12" height="12" rx="1" fill="#1A3B8C" />
      <rect x="29" y="3"  width="18" height="18" rx="2" fill="none" stroke="#1A3B8C" strokeWidth="1.5" />
      <rect x="32" y="6"  width="12" height="12" rx="1" fill="#1A3B8C" />
      <rect x="3"  y="29" width="18" height="18" rx="2" fill="none" stroke="#1A3B8C" strokeWidth="1.5" />
      <rect x="6"  y="32" width="12" height="12" rx="1" fill="#1A3B8C" />
      <rect x="23" y="3"  width="3" height="3" fill="#1A3B8C" />
      <rect x="29" y="23" width="3" height="3" fill="#1A3B8C" />
      <rect x="23" y="29" width="3" height="3" fill="#0EA5E9" />
      <rect x="35" y="29" width="3" height="3" fill="#1A3B8C" />
      <rect x="29" y="35" width="3" height="3" fill="#1A3B8C" />
      <rect x="41" y="35" width="3" height="3" fill="#1A3B8C" />
      <rect x="41" y="41" width="3" height="3" fill="#1A3B8C" />
      <rect x="23" y="23" width="3" height="3" fill="#1A3B8C" />
      <rect x="23" y="41" width="3" height="3" fill="#1A3B8C" />
      <rect x="35" y="41" width="3" height="3" fill="#0EA5E9" />
    </svg>
  );
}

// ─── Puce EMV ─────────────────────────────────────────────────────────────────
function PuceEMV() {
  return (
    <div style={{
      width: 36, height: 26, background: '#D4AF37', borderRadius: 4,
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', width: 26, height: 18,
        border: '0.5px solid rgba(0,0,0,0.25)', borderRadius: 2,
        top: 4, left: 5,
      }} />
      <div style={{
        position: 'absolute', width: 12, top: 4, bottom: 4, left: 12,
        borderLeft: '0.5px solid rgba(0,0,0,0.15)',
        borderRight: '0.5px solid rgba(0,0,0,0.15)',
      }} />
    </div>
  );
}

// ─── Icône NFC ────────────────────────────────────────────────────────────────
function NFCIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
      <path d="M1 6a11 11 0 0 1 0 12" strokeLinecap="round" />
      <path d="M5 8.5a7 7 0 0 1 0 7" strokeLinecap="round" />
      <path d="M9 11a3 3 0 0 1 0 2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarteData {
  id            : string;
  type          : 'VIRTUELLE' | 'PHYSIQUE';
  numero_masque : string;
  statut        : 'ACTIVE' | 'BLOQUEE' | 'EXPIREE' | 'PERDUE';
  date_expiration: string;
  prefixe?      : string;
  nfc_active?   : boolean;
  user?         : { nom: string; prenom: string; liensBeneficiaire?: { entreprise: { nom: string } }[] };
}

interface Props {
  carte        : CarteData;
  scale?       : number;   // ex: 0.85 pour réduire
  showQR?      : boolean;
  verso?       : boolean;
  cvv?         : string;
}

// ─── CARTE VIRTUELLE (recto) ──────────────────────────────────────────────────

export function CarteVirtuelle({ carte, scale = 1, showQR = false, cvv }: Props) {
  const exp = carte.date_expiration
    ? new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
    : '—';

  const nomTitulaire = carte.user
    ? `${carte.user.prenom?.toUpperCase() ?? ''} ${carte.user.nom?.toUpperCase() ?? ''}`.trim()
    : '• • • •';

  const entreprise = carte.user?.liensBeneficiaire?.[0]?.entreprise?.nom ?? '';

  const bloquee = carte.statut === 'BLOQUEE';

  return (
    <div style={{
      width: 340, height: 214, borderRadius: 16,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      flexShrink: 0,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: bloquee ? '#2d3748' : '#1A3B8C',
      opacity: bloquee ? 0.85 : 1,
    }}>
      {/* Grille */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: [
          'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 24px)',
          'repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 24px)',
        ].join(','),
      }} />
      {/* Cercles décoratifs */}
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(14,165,233,0.08)', top: -60, right: -60 }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -50, left: -30 }} />

      {/* Contenu */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100%',
        padding: '18px 22px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* Rangée 1 : logo + badge type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoTikexo />
            <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '0.5px' }}>Tikexo</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px' }}>
              TITRE-RESTAURANT
            </span>
            <span style={{ display: 'block', fontSize: 9, color: bloquee ? '#FC8181' : '#0EA5E9', letterSpacing: '1px', marginTop: 1 }}>
              {bloquee ? 'BLOQUÉE' : 'VIRTUELLE · BÉNIN'}
            </span>
          </div>
        </div>

        {/* Rangée 2 : numéro + QR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Numéro en 4 groupes séparés pour lisibilité */}
          <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center' }}>
            {carte.numero_masque.split(' ').map((groupe, i) => (
              <span key={i} style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: 15, fontWeight: 500,
                color: i === 0 || i === 3 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                letterSpacing: '2px',
              }}>
                {groupe}
              </span>
            ))}
          </div>
          <div style={{
            width: 60, height: 60, background: '#fff', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 5, flexShrink: 0,
          }}>
            {showQR ? <QRPlaceholder /> : (
              <svg width="50" height="50" viewBox="0 0 50 50" opacity={0.15}>
                <rect width="50" height="50" fill="#1A3B8C" rx="4" />
                <text x="25" y="30" textAnchor="middle" fontSize="8" fill="white" fontFamily="sans-serif">QR</text>
              </svg>
            )}
          </div>
        </div>

        {/* Rangée 3 : titulaire + expiration */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '1.5px', marginBottom: 3 }}>TITULAIRE</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', letterSpacing: '0.8px' }}>{nomTitulaire}</div>
            {entreprise && (
              <div style={{ fontSize: 9, color: '#0EA5E9', marginTop: 3, letterSpacing: '0.5px' }}>{entreprise}</div>
            )}
          </div>
          <div>
            {cvv && (
              <div style={{ textAlign: 'right', marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '1px', marginBottom: 2 }}>CVV</div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0EA5E9',
                }}>{cvv}</span>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '1px', marginBottom: 3 }}>EXPIRE</div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#fff' }}>{exp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre accent bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: bloquee ? '#FC8181' : '#0EA5E9', zIndex: 3 }} />
    </div>
  );
}

// ─── CARTE PHYSIQUE (recto) ───────────────────────────────────────────────────

export function CartePhysique({ carte, scale = 1 }: Props) {
  const exp = carte.date_expiration
    ? new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
    : '—';
  const nomTitulaire = carte.user
    ? `${carte.user.prenom?.toUpperCase() ?? ''} ${carte.user.nom?.toUpperCase() ?? ''}`.trim()
    : '• • • •';
  const entreprise = carte.user?.liensBeneficiaire?.[0]?.entreprise?.nom ?? '';
  const bloquee = carte.statut === 'BLOQUEE';

  return (
    <div style={{
      width: 340, height: 214, borderRadius: 16,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      flexShrink: 0,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: bloquee ? '#2d3748' : '#1A3B8C',
    }}>
      {/* Grille diagonale */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: [
          'repeating-linear-gradient(60deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 28px)',
          'repeating-linear-gradient(-60deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 28px)',
        ].join(','),
      }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -70, right: -70 }} />

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100%',
        padding: '18px 22px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoTikexo />
            <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '0.5px' }}>Tikexo</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textAlign: 'right', lineHeight: 1.5 }}>
            TITRE-RESTAURANT<br />
            <span style={{ color: bloquee ? '#FC8181' : 'rgba(255,255,255,0.25)' }}>{bloquee ? 'BLOQUÉE' : 'PHYSIQUE · BÉNIN'}</span>
          </div>
        </div>

        {/* Row 2 : puce + NFC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PuceEMV />
          <NFCIcon />
        </div>

        {/* Numéro en 4 groupes */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {carte.numero_masque.split(' ').map((groupe, i) => (
            <span key={i} style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 15, fontWeight: 500,
              color: i === 0 || i === 3 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
              letterSpacing: '2px',
            }}>
              {groupe}
            </span>
          ))}
        </div>

        {/* Row 3 : titulaire + expiration */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '1.5px', marginBottom: 3 }}>TITULAIRE</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', letterSpacing: '0.8px' }}>{nomTitulaire}</div>
            {entreprise && <div style={{ fontSize: 9, color: '#0EA5E9', marginTop: 3 }}>{entreprise}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '1px', marginBottom: 3 }}>EXPIRE</div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#fff' }}>{exp}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: bloquee ? '#FC8181' : '#0EA5E9', zIndex: 3 }} />
    </div>
  );
}

// ─── VERSO (physique) ─────────────────────────────────────────────────────────

export function CarteVersо({ cvv }: { cvv?: string }) {
  return (
    <div style={{
      width: 340, height: 214, borderRadius: 16,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      background: '#0f2660',
    }}>
      {/* Bande magnétique */}
      <div style={{ position: 'absolute', top: 32, left: 0, right: 0, height: 38, background: '#111' }} />

      {/* Bande signature + CVV */}
      <div style={{
        position: 'absolute', top: 98, left: 22, right: 22, height: 30,
        background: 'rgba(255,255,255,0.92)', borderRadius: 3,
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              height: 1,
              background: 'repeating-linear-gradient(90deg,#ddd 0,#ddd 4px,#fff 4px,#fff 8px)',
            }} />
          ))}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500,
          color: '#1A3B8C', background: '#fff',
          padding: '2px 8px', border: '0.5px solid #ccc', borderRadius: 3, flexShrink: 0,
        }}>
          {cvv ?? '•••'}
        </div>
      </div>

      {/* Bas verso */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100%',
        padding: '18px 22px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
            Propriété de TIKEXO · tikexo.bj<br />
            Utilisation : restaurants partenaires uniquement<br />
            Perte ou vol : support@tikexo.bj
          </div>
          <LogoTikexo size={22} />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#0EA5E9', zIndex: 3 }} />
    </div>
  );
}

// ─── Export composant auto (virtuelle ou physique) ───────────────────────────

export default function CarteVisuelle(props: Props) {
  if (props.verso) return <CarteVersо cvv={props.cvv} />;
  if (props.carte.type === 'PHYSIQUE') return <CartePhysique {...props} />;
  return <CarteVirtuelle {...props} />;
}
