import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type StatutKyb = 'NON_SOUMIS' | 'EN_COURS' | 'EN_REVUE' | 'VALIDE' | 'REJETE';
type TypeDoc = 'CARTE_NIF' | 'EXTRAIT_RCCM' | 'PIECE_IDENTITE_DIRIGEANT' | 'STATUTS_SOCIETE';
type StatutDoc = 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

interface KybDoc {
  id: string;
  type: TypeDoc;
  statut: StatutDoc;
  fichier_nom: string;
  fichier_taille: number;
  fichier_url: string;
  motif_rejet?: string;
  version: number;
  createdAt: string;
}

interface KybData {
  id: string;
  statut: StatutKyb;
  kyb_deadline: string;
  jours_restants: number;
  progression: string;
  nb_obligatoires_upload: number;
  deadline_depassee: boolean;
  docs_actifs: Partial<Record<TypeDoc, KybDoc>>;
  fonctionnalites: {
    rechargement_max: number | null;
    exports_actifs: boolean;
    mutations_actives: boolean;
    kyb_valide: boolean;
  };
}

// ── Config documents ───────────────────────────────────────────────────────
const DOCS_CONFIG: { type: TypeDoc; label: string; description: string; icon: string; iconBg: string; iconColor: string; obligatoire: boolean }[] = [
  { type: 'CARTE_NIF',               label: 'Carte NIF / Attestation DGID',  description: 'Identifiant fiscal béninois en cours de validité', icon: 'ti-file-text',        iconBg: '#EAF3DE', iconColor: '#3B6D11', obligatoire: true },
  { type: 'EXTRAIT_RCCM',            label: 'Extrait RCCM',                   description: 'Registre du Commerce et du Crédit Mobilier',        icon: 'ti-building-store',   iconBg: '#DBEAFE', iconColor: '#185FA5', obligatoire: true },
  { type: 'PIECE_IDENTITE_DIRIGEANT',label: "Pièce d'identité du dirigeant",  description: 'CNI ou passeport recto/verso',                      icon: 'ti-id-badge',         iconBg: '#DBEAFE', iconColor: '#185FA5', obligatoire: true },
  { type: 'STATUTS_SOCIETE',         label: 'Statuts de la société',          description: 'Requis uniquement pour les comptes Business 100+',   icon: 'ti-file-certificate', iconBg: '#F1F5F9', iconColor: '#94A3B8', obligatoire: false },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
.kyb-pg *{box-sizing:border-box;}
.kyb-pg{font-family:'Inter',sans-serif;color:#1E293B;min-height:100vh;background:#F1F5F9;padding:32px 16px;}
.kyb-inner{max-width:860px;margin:0 auto;}
.kyb-two{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.kyb-dark{background:#1A3C5E;padding:32px 28px;display:flex;flex-direction:column;justify-content:space-between;border-radius:14px 0 0 14px;}
.kyb-light{background:#fff;border:0.5px solid #E2E8F0;padding:28px 24px;border-radius:0 14px 14px 0;overflow-y:auto;max-height:calc(100vh - 64px);}
.steps-bar{display:flex;align-items:center;margin-bottom:22px;}
.step-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
.step-circle{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;}
.step-circle.done{background:#0EA5E9;color:#fff;}
.step-circle.active{background:#1A3C5E;color:#fff;}
.step-circle.todo{background:#F1F5F9;color:#94A3B8;border:0.5px solid #E2E8F0;}
.step-lbl{font-size:9px;color:#94A3B8;text-align:center;}
.step-lbl.active{color:#1A3C5E;font-weight:500;}
.step-connector{flex:1;height:0.5px;background:#E2E8F0;margin-top:-16px;}
.step-connector.done{background:#0EA5E9;}
.upload-doc{border:0.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:10px;}
.upload-doc-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#F8FAFC;border-bottom:0.5px solid #E2E8F0;}
.udh-left{display:flex;align-items:center;gap:10px;}
.udh-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.udh-icon i{font-size:17px;}
.udh-title{font-size:12px;font-weight:500;color:#1E293B;}
.udh-sub{font-size:10px;color:#94A3B8;margin-top:1px;}
.udh-badge{font-size:9px;padding:2px 8px;border-radius:8px;font-weight:500;flex-shrink:0;}
.badge-required{background:#FAEEDA;color:#854F0B;}
.badge-optional{background:#F1F5F9;color:#94A3B8;}
.badge-uploaded{background:#EAF3DE;color:#3B6D11;}
.badge-rejected{background:#FCEBEB;color:#A32D2D;}
.badge-review{background:#DBEAFE;color:#185FA5;}
.badge-valid{background:#EAF3DE;color:#3B6D11;}
.upload-zone{padding:14px;}
.drop-area{border:1.5px dashed #CBD5E1;border-radius:10px;padding:16px;text-align:center;background:#FAFBFC;cursor:pointer;transition:border-color .15s;}
.drop-area:hover{border-color:#1A3C5E;}
.drop-area.uploaded{border-color:#A8B8A2;background:#F0F4EF;border-style:solid;}
.drop-area.rejected{border-color:#D97A7A;background:#FEF2F2;border-style:solid;}
.drop-area.valid{border-color:#A8B8A2;background:#F0F4EF;border-style:solid;}
.drop-area.uploading{border-color:#0EA5E9;background:#EFF8FF;border-style:solid;}
.drop-icon{font-size:28px;color:#CBD5E1;margin-bottom:6px;}
.drop-icon.uploaded,.drop-icon.valid{color:#A8B8A2;}
.drop-icon.rejected{color:#D97A7A;}
.drop-title{font-size:12px;font-weight:500;color:#1E293B;margin-bottom:3px;}
.drop-sub{font-size:10px;color:#94A3B8;line-height:1.5;}
.drop-sub.uploaded,.drop-sub.valid{color:#3B6D11;}
.drop-sub.rejected{color:#A32D2D;}
.drop-formats{font-size:9px;color:#CBD5E1;margin-top:6px;}
.drop-btn{display:inline-flex;align-items:center;gap:5px;background:#1A3C5E;color:#fff;font-size:10px;padding:6px 14px;border-radius:8px;cursor:pointer;margin-top:8px;border:none;font-family:'Inter',sans-serif;}
.drop-btn i{font-size:13px;}
.drop-btn.change{background:transparent;color:#64748B;border:0.5px solid #CBD5E1;}
.reject-note{display:flex;align-items:flex-start;gap:7px;background:#FCEBEB;border-radius:8px;padding:8px 10px;margin-top:8px;}
.reject-note i{font-size:14px;color:#A32D2D;flex-shrink:0;margin-top:1px;}
.reject-note-text{font-size:10px;color:#7A2020;line-height:1.5;}
.kyb-tracker{background:#1A3C5E;border-radius:12px;padding:18px;}
.kt-title{font-size:9px;color:rgba(255,255,255,0.28);letter-spacing:2px;margin-bottom:14px;}
.kt-steps{display:flex;flex-direction:column;gap:0;}
.kt-step{display:flex;gap:12px;padding-bottom:14px;position:relative;}
.kt-step:last-child{padding-bottom:0;}
.kt-step::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:1px;background:rgba(255,255,255,0.08);}
.kt-step:last-child::before{display:none;}
.kt-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.kt-dot.done{background:#0EA5E9;}
.kt-dot.current{background:#C6A769;}
.kt-dot.pending{background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.15);}
.kt-dot i{font-size:12px;}
.kt-dot.done i,.kt-dot.current i{color:#fff;}
.kt-dot.pending i{color:rgba(255,255,255,0.25);}
.kt-content{flex:1;}
.kt-step-title{font-size:12px;font-weight:500;margin-bottom:2px;}
.kt-step-title.done{color:#fff;}
.kt-step-title.current{color:#C6A769;}
.kt-step-title.pending{color:rgba(255,255,255,0.3);}
.kt-step-sub{font-size:10px;line-height:1.4;}
.kt-step-sub.done{color:rgba(255,255,255,0.4);}
.kt-step-sub.current{color:rgba(198,167,105,0.6);}
.kt-step-sub.pending{color:rgba(255,255,255,0.2);}
.alert-banner{border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:flex-start;gap:8px;}
.alert-banner.warn{background:#FAEEDA;border:0.5px solid #FAC775;}
.alert-banner.success{background:#EAF3DE;border:0.5px solid #C0DD97;}
.alert-banner.danger{background:#FCEBEB;border:0.5px solid #F4BBBB;}
.alert-banner i{font-size:16px;flex-shrink:0;margin-top:1px;}
.alert-banner.warn i{color:#854F0B;}
.alert-banner.success i{color:#3B6D11;}
.alert-banner.danger i{color:#A32D2D;}
.alert-text{font-size:11px;line-height:1.5;}
.alert-banner.warn .alert-text{color:#5C3A0B;}
.alert-banner.success .alert-text{color:#27500A;}
.alert-banner.danger .alert-text{color:#7A2020;}
.progress-bar-outer{height:4px;background:#E2E8F0;border-radius:4px;margin-bottom:20px;}
.progress-bar-inner{height:100%;border-radius:4px;background:#0EA5E9;transition:width .3s;}
.section-sep{font-size:10px;font-weight:500;letter-spacing:1.5px;display:flex;align-items:center;gap:7px;margin:14px 0 10px;}
.section-sep span{flex:1;height:0.5px;background:#E2E8F0;display:block;}
.kyb-btn{width:100%;background:#1A3C5E;color:#fff;font-size:13px;font-weight:500;padding:12px;border-radius:10px;border:none;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:6px;}
.kyb-btn:disabled{opacity:0.4;cursor:not-allowed;}
.kyb-btn i{font-size:16px;}
.kyb-btn-ghost{width:100%;background:transparent;color:#64748B;font-size:12px;padding:10px;border-radius:10px;border:0.5px solid #CBD5E1;cursor:pointer;font-family:'Inter',sans-serif;margin-top:8px;}
.progress-bar{height:3px;background:#0EA5E9;border-radius:3px;margin-top:6px;transition:width .3s;}
`;

// ── Composant zone d'upload ────────────────────────────────────────────────
function DocZone({ config, doc, onUpload, uploading }: {
  config: typeof DOCS_CONFIG[0];
  doc?: KybDoc;
  onUpload: (type: TypeDoc, file: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const statut = doc?.statut;
  const isUploaded = statut === 'EN_ATTENTE';
  const isValid = statut === 'VALIDE';
  const isRejected = statut === 'REJETE';

  function handleFile(file: File) {
    const maxSize = config.type === 'STATUTS_SOCIETE' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { alert(`Fichier trop lourd — max ${maxSize / 1024 / 1024} Mo`); return; }
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
    if (!ok) { alert('Format non accepté — JPG, PNG ou PDF uniquement'); return; }
    onUpload(config.type, file);
  }

  const dropCls = isValid ? 'valid' : isUploaded ? 'uploaded' : isRejected ? 'rejected' : uploading ? 'uploading' : '';
  const badgeCls = isValid ? 'badge-valid' : isUploaded ? 'badge-uploaded' : isRejected ? 'badge-rejected' : config.obligatoire ? 'badge-required' : 'badge-optional';
  const badgeLabel = isValid ? '✓ Validé' : isUploaded ? '✓ Uploadé' : isRejected ? '✗ Rejeté' : config.obligatoire ? 'Obligatoire' : 'Optionnel';

  return (
    <div className="upload-doc">
      <div className="upload-doc-header">
        <div className="udh-left">
          <div className="udh-icon" style={{ background: config.iconBg }}>
            <i className={`ti ${config.icon}`} style={{ color: config.iconColor }} aria-hidden="true" />
          </div>
          <div>
            <div className="udh-title">{config.label}</div>
            <div className="udh-sub">{config.description}</div>
          </div>
        </div>
        <div className={`udh-badge ${badgeCls}`}>{badgeLabel}</div>
      </div>

      <div className="upload-zone">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div
          className={`drop-area ${dropCls}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <div className="drop-icon"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></div>
              <div className="drop-title">Envoi en cours…</div>
            </>
          ) : isValid ? (
            <>
              <div className="drop-icon valid"><i className="ti ti-shield-check" /></div>
              <div className="drop-title">{doc!.fichier_nom}</div>
              <div className="drop-sub valid">Document validé par TIKEXO</div>
            </>
          ) : isUploaded ? (
            <>
              <div className="drop-icon uploaded"><i className="ti ti-circle-check" /></div>
              <div className="drop-title">{doc!.fichier_nom}</div>
              <div className="drop-sub uploaded">Document reçu · En attente de vérification</div>
              <button className="drop-btn change" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <i className="ti ti-refresh" /> Remplacer
              </button>
            </>
          ) : isRejected ? (
            <>
              <div className="drop-icon rejected"><i className="ti ti-alert-circle" /></div>
              <div className="drop-title">{doc!.fichier_nom}</div>
              <div className="drop-sub rejected">Document illisible — veuillez renvoyer</div>
              <button className="drop-btn"><i className="ti ti-upload" /> Renvoyer le document</button>
            </>
          ) : (
            <>
              <div className="drop-icon"><i className="ti ti-cloud-upload" /></div>
              <div className="drop-title">Glissez le fichier ici</div>
              <div className="drop-sub">ou cliquez pour parcourir vos fichiers</div>
              <div className="drop-formats">
                {config.type === 'STATUTS_SOCIETE' ? 'PDF · Max 20 Mo' : 'JPG, PNG, PDF · Max 10 Mo'}
              </div>
              <button className="drop-btn"><i className="ti ti-upload" /> Choisir un fichier</button>
            </>
          )}
        </div>

        {isRejected && doc?.motif_rejet && (
          <div className="reject-note">
            <i className="ti ti-message-circle" />
            <div className="reject-note-text">
              <strong style={{ fontWeight: 500 }}>Motif :</strong> {doc.motif_rejet}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function KybDossier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<TypeDoc | null>(null);

  const { data: kyb, isLoading } = useQuery<KybData>({
    queryKey: ['kyb-dossier', user?.entrepriseId],
    queryFn: () => api.get('/kyb/dossier').then((r) => r.data.data),
    enabled: !!user?.entrepriseId,
    refetchInterval: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: TypeDoc; file: File }) => {
      const form = new FormData();
      form.append('type', type);
      form.append('fichier', file);
      const res = await api.post('/kyb/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onMutate: ({ type }) => setUploadingType(type),
    onSuccess: (data) => {
      queryClient.setQueryData(['kyb-dossier', user?.entrepriseId], data);
      setUploadingType(null);
    },
    onError: () => setUploadingType(null),
  });

  if (isLoading || !kyb) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-sm text-slate-400">Chargement du dossier KYB…</div>
      </div>
    );
  }

  const { jours_restants, nb_obligatoires_upload, statut, docs_actifs, fonctionnalites } = kyb;
  const progression = Math.round((nb_obligatoires_upload / 3) * 100);

  // États tracker
  const walletRecharge = true; // simplifié — on suppose que c'est fait
  const trackUpload = nb_obligatoires_upload > 0 ? (nb_obligatoires_upload === 3 ? 'done' : 'current') : 'current';
  const trackRevue = statut === 'EN_REVUE' || statut === 'VALIDE' ? (statut === 'VALIDE' ? 'done' : 'current') : 'pending';
  const trackValide = statut === 'VALIDE' ? 'done' : 'pending';

  const alertType = statut === 'VALIDE' ? 'success' : jours_restants <= 2 ? 'danger' : 'warn';
  const alertIcon = statut === 'VALIDE' ? 'ti-shield-check' : 'ti-clock';
  const alertMsg = statut === 'VALIDE'
    ? 'KYB validé — Toutes les fonctionnalités sont débloquées.'
    : statut === 'EN_REVUE'
    ? 'Dossier complet · En cours de vérification par l\'équipe TIKEXO (48h ouvrées).'
    : jours_restants === 0
    ? 'Délai expiré — vos rechargements sont maintenant limités à 0 XOF.'
    : `7 jours pour compléter votre dossier. Sans documents, vos rechargements seront limités à 500 000 XOF. ${jours_restants} jour${jours_restants > 1 ? 's' : ''} restant${jours_restants > 1 ? 's' : ''}.`;

  return (
    <>
      <style>{CSS}</style>
      <div className="kyb-pg">
        <div className="kyb-inner">
          <div className="kyb-two">
            {/* Panneau sombre gauche */}
            <div className="kyb-dark">
              <div>
                <div style={{ fontSize: 9, color: '#0EA5E9', letterSpacing: 3, fontWeight: 500, marginBottom: 10 }}>TIKEXO · VÉRIFICATION KYB</div>
                <h2 style={{ fontSize: 20, fontWeight: 300, color: '#fff', lineHeight: 1.3, marginBottom: 8 }}>
                  Validez votre<br /><strong style={{ fontWeight: 500 }}>identité juridique.</strong>
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 20 }}>
                  Votre compte est déjà actif. Ces documents permettent à l'équipe TIKEXO de valider votre dossier sous 48h ouvrées.
                </p>

                <div className="kyb-tracker">
                  <div className="kt-title">STATUT DE VOTRE DOSSIER</div>
                  <div className="kt-steps">
                    <div className="kt-step">
                      <div className="kt-dot done"><i className="ti ti-check" /></div>
                      <div className="kt-content">
                        <div className="kt-step-title done">Compte créé</div>
                        <div className="kt-step-sub done">Portail RH accessible</div>
                      </div>
                    </div>
                    <div className="kt-step">
                      <div className="kt-dot done"><i className="ti ti-check" /></div>
                      <div className="kt-content">
                        <div className="kt-step-title done">Wallet activé</div>
                        <div className="kt-step-sub done">Dotations disponibles</div>
                      </div>
                    </div>
                    <div className="kt-step">
                      <div className={`kt-dot ${trackUpload}`}>
                        <i className={trackUpload === 'done' ? 'ti ti-check' : 'ti ti-upload'} />
                      </div>
                      <div className="kt-content">
                        <div className={`kt-step-title ${trackUpload}`}>Upload justificatifs</div>
                        <div className={`kt-step-sub ${trackUpload}`}>
                          {nb_obligatoires_upload}/3 documents envoyés · {trackUpload === 'done' ? 'Complet' : 'En cours'}
                        </div>
                      </div>
                    </div>
                    <div className="kt-step">
                      <div className={`kt-dot ${trackRevue}`}>
                        <i className={trackRevue === 'done' ? 'ti ti-check' : 'ti ti-eye'} />
                      </div>
                      <div className="kt-content">
                        <div className={`kt-step-title ${trackRevue}`}>Vérification TIKEXO</div>
                        <div className={`kt-step-sub ${trackRevue}`}>Sous 48h après réception complète</div>
                      </div>
                    </div>
                    <div className="kt-step">
                      <div className={`kt-dot ${trackValide}`}>
                        <i className={trackValide === 'done' ? 'ti ti-check' : 'ti ti-shield-check'} />
                      </div>
                      <div className="kt-content">
                        <div className={`kt-step-title ${trackValide}`}>KYB validé</div>
                        <div className={`kt-step-sub ${trackValide}`}>Accès complet à toutes les fonctions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginTop: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginBottom: 8 }}>SANS KYB VALIDÉ</div>
                {[
                  { ok: true, txt: 'Portail RH accessible' },
                  { ok: true, txt: 'Ajout et dotation des salariés' },
                  { ok: false, txt: 'Rechargements limités à 500 000 XOF' },
                  { ok: false, txt: 'Exports comptables désactivés' },
                ].map(({ ok, txt }) => (
                  <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <i className={ok ? 'ti ti-check' : 'ti ti-x'} style={{ fontSize: 13, color: ok ? '#0EA5E9' : '#D97A7A' }} />
                    <span style={{ fontSize: 11, color: ok ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)' }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panneau clair droite */}
            <div className="kyb-light">
              {/* Barre d'étapes */}
              <div className="steps-bar">
                {['Compte', 'Plan', 'Rechargement', 'KYB'].map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <div className="step-connector done" />}
                    <div className="step-item">
                      <div className={`step-circle ${i < 3 ? 'done' : 'active'}`}>
                        {i < 3 ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : 4}
                      </div>
                      <div className={`step-lbl ${i === 3 ? 'active' : ''}`}>{s}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Alerte deadline */}
              {statut !== 'VALIDE' && (
                <div className={`alert-banner ${alertType}`}>
                  <i className={`ti ${alertIcon}`} />
                  <div className="alert-text">{alertMsg}</div>
                </div>
              )}
              {statut === 'VALIDE' && (
                <div className="alert-banner success">
                  <i className="ti ti-shield-check" />
                  <div className="alert-text"><strong style={{ fontWeight: 500 }}>KYB validé ✓</strong> — Toutes les fonctionnalités sont débloquées.</div>
                </div>
              )}

              {/* Barre de progression */}
              <div className="progress-bar-outer">
                <div className="progress-bar-inner" style={{ width: `${progression}%` }} />
              </div>

              {/* Documents obligatoires */}
              <div className="section-sep" style={{ color: '#0EA5E9' }}>
                DOCUMENTS OBLIGATOIRES <span />
              </div>

              {DOCS_CONFIG.filter((d) => d.obligatoire).map((config) => (
                <DocZone
                  key={config.type}
                  config={config}
                  doc={docs_actifs[config.type]}
                  onUpload={(type, file) => uploadMutation.mutate({ type, file })}
                  uploading={uploadingType === config.type}
                />
              ))}

              {/* Document optionnel */}
              <div className="section-sep" style={{ color: '#94A3B8' }}>
                DOCUMENT OPTIONNEL <span />
              </div>

              {DOCS_CONFIG.filter((d) => !d.obligatoire).map((config) => (
                <DocZone
                  key={config.type}
                  config={config}
                  doc={docs_actifs[config.type]}
                  onUpload={(type, file) => uploadMutation.mutate({ type, file })}
                  uploading={uploadingType === config.type}
                />
              ))}

              {statut !== 'VALIDE' && (
                <>
                  <button
                    className="kyb-btn"
                    disabled={nb_obligatoires_upload < 3 || statut === 'EN_REVUE'}
                  >
                    <i className="ti ti-send" />
                    {statut === 'EN_REVUE' ? 'Dossier soumis — en cours de vérification' : 'Soumettre le dossier KYB'}
                  </button>
                  <button className="kyb-btn-ghost" onClick={() => window.history.back()}>
                    Compléter plus tard depuis mon espace
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
