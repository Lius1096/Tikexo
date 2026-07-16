import React, { useRef, useState, useCallback } from 'react';
import {
  CloudUpload, Upload, RefreshCw, Trash2, AlertCircle,
  ShieldCheck, ArrowRight, Info, CheckCircle2, Eye,
  FileText, Store, CreditCard, FileCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import StepsBar from './StepsBar';
import { calculerFraisGestion } from './types';

export type TypeDoc = 'CARTE_NIF' | 'EXTRAIT_RCCM' | 'PIECE_IDENTITE_DIRIGEANT' | 'STATUTS_SOCIETE';

export interface KybFile {
  type: TypeDoc;
  file: File;
}

interface Props {
  docs: KybFile[];
  nbSalaries: string;
  onChangeDocs: (docs: KybFile[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const DOCS_CONFIG: {
  type: TypeDoc;
  label: string;
  description: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  obligatoire: boolean;
  maxMo: number;
}[] = [
  { type: 'CARTE_NIF',                label: 'Carte NIF / Attestation DGID',  description: 'Identifiant fiscal béninois en cours de validité', Icon: FileText,   iconBg: '#EAF3DE', iconColor: '#3B6D11', obligatoire: true,  maxMo: 10 },
  { type: 'EXTRAIT_RCCM',             label: 'Extrait RCCM',                   description: 'Registre du Commerce et du Crédit Mobilier',       Icon: Store,      iconBg: '#DBEAFE', iconColor: '#185FA5', obligatoire: true,  maxMo: 10 },
  { type: 'PIECE_IDENTITE_DIRIGEANT', label: "Pièce d'identité du dirigeant", description: 'CNI ou passeport recto/verso',                     Icon: CreditCard, iconBg: '#DBEAFE', iconColor: '#185FA5', obligatoire: true,  maxMo: 10 },
  { type: 'STATUTS_SOCIETE',          label: 'Statuts de la société',          description: 'Requis pour les grandes entreprises (ETI / GE)',   Icon: FileCheck,  iconBg: '#F1F5F9', iconColor: '#94A3B8', obligatoire: false, maxMo: 20 },
];

const CSS = `
.s3k *{box-sizing:border-box;}
.s3k{font-family:'Inter',sans-serif;color:#1E293B;}
.s3k .upload-doc{border:0.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:10px;}
.s3k .upload-doc-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#F8FAFC;border-bottom:0.5px solid #E2E8F0;}
.s3k .udh-left{display:flex;align-items:center;gap:10px;}
.s3k .udh-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.s3k .udh-title{font-size:12px;font-weight:500;color:#1E293B;}
.s3k .udh-sub{font-size:10px;color:#94A3B8;margin-top:1px;}
.s3k .udh-badge{font-size:9px;padding:2px 8px;border-radius:8px;font-weight:500;flex-shrink:0;}
.s3k .badge-required{background:#FAEEDA;color:#854F0B;}
.s3k .badge-optional{background:#F1F5F9;color:#94A3B8;}
.s3k .badge-uploaded{background:#EAF3DE;color:#3B6D11;}
.s3k .upload-zone{padding:14px;}
.s3k .drop-area{border:1.5px dashed #CBD5E1;border-radius:10px;padding:18px;text-align:center;background:#FAFBFC;cursor:pointer;transition:all .15s;}
.s3k .drop-area:hover{border-color:#1A3C5E;background:#F8FAFF;}
.s3k .drop-area.over{border-color:#1A3C5E;background:#EFF4FF;}
.s3k .drop-area.uploaded{border-color:#A8C89E;background:#F4FBF0;border-style:solid;cursor:default;}
.s3k .drop-area.error{border-color:#D97A7A;background:#FEF2F2;}
.s3k .drop-title{font-size:12px;font-weight:500;color:#1E293B;margin-bottom:3px;}
.s3k .drop-sub{font-size:10px;color:#94A3B8;line-height:1.5;}
.s3k .drop-sub.uploaded{color:#3B6D11;}
.s3k .drop-formats{font-size:9px;color:#CBD5E1;margin-top:6px;letter-spacing:.3px;}
.s3k .drop-btn{display:inline-flex;align-items:center;gap:5px;background:#1A3C5E;color:#fff;font-size:10px;font-weight:500;padding:6px 14px;border-radius:8px;cursor:pointer;margin-top:8px;border:none;font-family:'Inter',sans-serif;}
.s3k .drop-btn.change{background:transparent;color:#64748B;border:0.5px solid #CBD5E1;}
.s3k .err-msg{font-size:10px;color:#A32D2D;margin-top:5px;display:flex;align-items:center;gap:4px;}
.s3k .section-sep{font-size:9px;font-weight:600;letter-spacing:1.5px;display:flex;align-items:center;gap:7px;margin:14px 0 10px;color:#94A3B8;}
.s3k .section-sep span{flex:1;height:0.5px;background:#E2E8F0;display:block;}
.s3k .section-sep.blue{color:#0EA5E9;}
`;

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function DocZone({ config, uploaded, onFile, onRemove }: {
  config: (typeof DOCS_CONFIG)[0];
  uploaded: KybFile | null;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
    if (!ok) { setError('Format non accepté — JPG, PNG ou PDF uniquement'); return; }
    if (file.size > config.maxMo * 1024 * 1024) { setError(`Fichier trop lourd — ${config.maxMo} Mo maximum`); return; }
    setError(null);
    onFile(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [config]);

  const { Icon } = config;
  const badgeCls = uploaded ? 'badge-uploaded' : config.obligatoire ? 'badge-required' : 'badge-optional';
  const badgeTxt = uploaded ? '✓ Prêt' : config.obligatoire ? 'Obligatoire' : 'Optionnel';
  const dropCls = error ? 'error' : over ? 'over' : uploaded ? 'uploaded' : '';

  return (
    <div className="upload-doc">
      <div className="upload-doc-header">
        <div className="udh-left">
          <div className="udh-icon" style={{ background: config.iconBg }}>
            <Icon size={17} color={config.iconColor} />
          </div>
          <div>
            <div className="udh-title">{config.label}</div>
            <div className="udh-sub">{config.description}</div>
          </div>
        </div>
        <div className={`udh-badge ${badgeCls}`}>{badgeTxt}</div>
      </div>

      <div className="upload-zone">
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />

        <div
          className={`drop-area ${dropCls}`}
          onClick={() => !uploaded && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          {uploaded ? (
            <>
              <div style={{ marginBottom: 6 }}>
                <CheckCircle2 size={28} color="#5A9A50" />
              </div>
              <div className="drop-title">{uploaded.file.name}</div>
              <div className="drop-sub uploaded">{fmtSize(uploaded.file.size)} · Prêt à l'envoi</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <button className="drop-btn change" type="button" onClick={(e) => { e.stopPropagation(); const url = URL.createObjectURL(uploaded.file); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60_000); }}>
                  <Eye size={12} /> Visualiser
                </button>
                <button className="drop-btn change" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                  <RefreshCw size={12} /> Remplacer
                </button>
                <button className="drop-btn change" type="button" style={{ color: '#A32D2D', borderColor: '#F4BBBB' }} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 6 }}>
                <CloudUpload size={28} color={over ? '#1A3C5E' : '#CBD5E1'} />
              </div>
              <div className="drop-title">{over ? 'Déposez le fichier ici' : 'Glissez le fichier ici'}</div>
              <div className="drop-sub">ou cliquez pour parcourir vos fichiers</div>
              <div className="drop-formats">{`JPG · PNG · PDF — ${config.maxMo} Mo max`}</div>
              <button className="drop-btn" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload size={12} /> Choisir un fichier
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="err-msg">
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Step3Kyb({ docs, nbSalaries, onChangeDocs, onNext, onBack }: Props) {
  function getDoc(type: TypeDoc) {
    return docs.find((d) => d.type === type) ?? null;
  }
  function handleFile(type: TypeDoc, file: File) {
    onChangeDocs([...docs.filter((d) => d.type !== type), { type, file }]);
  }
  function removeDoc(type: TypeDoc) {
    onChangeDocs(docs.filter((d) => d.type !== type));
  }

  const obligatoires = DOCS_CONFIG.filter((d) => d.obligatoire);
  const optionnels = DOCS_CONFIG.filter((d) => !d.obligatoire);
  const nbOblig = obligatoires.filter((d) => getDoc(d.type)).length;
  const peutContinuer = nbOblig === 3;
  const progression = Math.round((nbOblig / 3) * 100);
  const { plan } = calculerFraisGestion(nbSalaries);
  const isGrandePlan = plan === 'ETI' || plan === 'GE';

  return (
    <>
      <style>{CSS}</style>
      <div className="s3k full-card">
        <div className="mnav">
          <span className="mnav-logo">TIKEXO</span>
          <div className="mnav-back" onClick={onBack}>
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} /> Modifier le plan
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <StepsBar etape={3} />

          <div style={{ fontSize: 14, fontWeight: 500, color: '#1E293B', marginBottom: 3 }}>Documents KYB</div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
            Ces justificatifs permettent à l'équipe TIKEXO de vérifier votre entreprise et d'activer votre accès. Formats acceptés : JPG, PNG, PDF.
          </div>

          {/* Barre progression */}
          <div style={{ height: 4, background: '#E2E8F0', borderRadius: 4, marginBottom: 18, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progression}%`, background: peutContinuer ? '#3B6D11' : '#0EA5E9', borderRadius: 4, transition: 'width .3s ease' }} />
          </div>

          <div className="section-sep blue">DOCUMENTS OBLIGATOIRES <span /></div>

          {obligatoires.map((config) => (
            <DocZone key={config.type} config={config} uploaded={getDoc(config.type)} onFile={(file) => handleFile(config.type, file)} onRemove={() => removeDoc(config.type)} />
          ))}

          <div className="section-sep">DOCUMENT OPTIONNEL <span /></div>

          {optionnels.map((config) => (
            <div key={config.type}>
              {isGrandePlan && (
                <div style={{ fontSize: 10, color: '#854F0B', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 8, padding: '5px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Info size={12} color="#854F0B" /> Fortement recommandé pour votre plan {plan}
                </div>
              )}
              <DocZone config={config} uploaded={getDoc(config.type)} onFile={(file) => handleFile(config.type, file)} onRemove={() => removeDoc(config.type)} />
            </div>
          ))}

          {/* Note sécurité */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', margin: '12px 0 18px' }}>
            <ShieldCheck size={14} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
              Documents chiffrés — accessibles uniquement à l'équipe TIKEXO pour vérification. Jamais partagés avec des tiers.
            </div>
          </div>

          <button
            className="btn-accent"
            disabled={!peutContinuer}
            onClick={onNext}
            style={{ opacity: peutContinuer ? 1 : 0.45, cursor: peutContinuer ? 'pointer' : 'not-allowed' }}
          >
            {peutContinuer
              ? <><ArrowRight size={15} /> Continuer — Confirmer l'inscription</>
              : <><Upload size={15} /> Encore {3 - nbOblig} document{3 - nbOblig > 1 ? 's' : ''} obligatoire{3 - nbOblig > 1 ? 's' : ''}</>
            }
          </button>
        </div>
      </div>
    </>
  );
}
