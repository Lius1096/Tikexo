import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Upload, FileText, CheckCircle, AlertTriangle,
  XCircle, ArrowRight, Download, Check, RefreshCw,
} from 'lucide-react';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  prenom: string; nom: string; telephone: string;
  email?: string; niveau?: string; valeur_repas?: string;
}

interface RowError {
  ligne: number;
  titre: string;
  detail: string;
}

interface ImportResultat {
  prenom: string; nom: string; telephone: string;
  statut: 'OK' | 'IGNORE' | 'ERREUR'; message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  prenom: 'Prénom', nom: 'Nom', telephone: 'Téléphone',
  email: 'Email pro', niveau: 'Niveau',
  valeur_repas: 'Allocation mensuelle (XOF)',
};

const CSV_HEADERS_MAP: Record<string, keyof CsvRow> = {
  prenom: 'prenom', prénom: 'prenom',
  nom: 'nom',
  telephone: 'telephone', téléphone: 'telephone', tel: 'telephone',
  email: 'email',
  niveau: 'niveau',
  valeur_repas: 'valeur_repas', valeur: 'valeur_repas', allocation: 'valeur_repas',
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { rows: CsvRow[]; headers: string[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], headers: [] };
  const rawHeaders = splitCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/^"|"$/g, '')
  );
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: any = {};
    rawHeaders.forEach((h, i) => { const k = CSV_HEADERS_MAP[h]; if (k) row[k] = values[i] ?? ''; });
    return row as CsvRow;
  });
  return { rows, headers: rawHeaders };
}

function validateRow(row: CsvRow, ligne: number): RowError | null {
  if (!row.prenom?.trim() || !row.nom?.trim()) {
    return { ligne, titre: 'Champs obligatoires manquants', detail: `Prénom et nom requis à la ligne ${ligne}` };
  }
  const tel = (row.telephone || '').replace(/\D/g, '');
  if (!tel || (tel.length !== 8 && tel.length !== 10)) {
    return { ligne, titre: 'Téléphone invalide', detail: `"${row.telephone || '—'}" — doit contenir 8 ou 10 chiffres` };
  }
  if (!row.email?.trim()) {
    return { ligne, titre: 'Email manquant', detail: `Email requis à la ligne ${ligne} — c'est ce qui permet d'envoyer l'invitation au bénéficiaire` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    return { ligne, titre: 'Email invalide', detail: `"${row.email}" — format incorrect` };
  }
  const niv = (row.niveau || '').toUpperCase();
  if (niv && !['EMPLOYE', 'CADRE', 'MANAGER', 'DIRECTEUR', ''].includes(niv)) {
    return { ligne, titre: 'Niveau inconnu', detail: `"${row.niveau}" — valeurs acceptées : EMPLOYE, CADRE, MANAGER, DIRECTEUR` };
  }
  return null;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function telechargerModele() {
  const content = [
    'prenom,nom,telephone,email,niveau,valeur_repas',
    'Kofi,Mensah,0197000001,kofi@gmail.com,EMPLOYE,5000',
    'Aïcha,Bello,0196000002,aicha.bello@gmail.com,CADRE,8000',
    'Jean-Baptiste,Houngbo,0195000003,jb.houngbo@gmail.com,MANAGER,10000',
    'Fatoumata,Dossou,0194000004,fatoumata@gmail.com,DIRECTEUR,15000',
  ].join('\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'modele_import_tikexo.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1, label: 'Modèle' },
    { n: 2, label: 'Upload' },
    { n: 3, label: 'Vérification' },
    { n: 4, label: 'Import' },
  ];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
              s.n < current  ? 'bg-orange-500 text-white' :
              s.n === current ? 'bg-orange-500 text-white' :
              'bg-slate-200 text-slate-400'
            )}>
              {s.n < current ? <Check size={11} /> : s.n}
            </div>
            <span className={clsx('text-[13px] font-medium whitespace-nowrap',
              s.n <= current ? 'text-slate-900' : 'text-slate-400'
            )}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={clsx('h-[2px] mx-3 flex-1 min-w-[32px] transition-colors',
              s.n < current ? 'bg-orange-500' : 'bg-slate-200'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────
// Import CSV en masse de bénéficiaires — utilisé sur la page dédiée et dans le
// modal "Nouveau bénéficiaire" (onglet Import).

export default function ImportCsvBeneficiaires({ entrepriseId, onFinish }: {
  entrepriseId: string;
  onFinish: () => void;
}) {
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [resultats, setResultats] = useState<ImportResultat[] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const valides = rows.filter((_, i) => !errors.some((e) => e.ligne === i + 2));
  const sampleRows = rows.slice(0, 3);
  const knownHeaders = headers.filter((h) => CSV_HEADERS_MAP[h]);

  const importMutation = useMutation({
    mutationFn: (r: CsvRow[]) =>
      api.post('/beneficiaires/import-bulk', { entrepriseId, rows: r }).then((res) => res.data.data),
    onSuccess: (data) => {
      setResultats(data.resultats);
      setStep(4);
      qc.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
    },
  });

  function processFile(f: File) {
    setFile(f);
    setResultats(null);
    importMutation.reset();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, headers: hdrs } = parseCSV(ev.target?.result as string);
      const errs: RowError[] = [];
      parsed.forEach((row, i) => {
        const err = validateRow(row, i + 2);
        if (err) errs.push(err);
      });
      setRows(parsed);
      setHeaders(hdrs);
      setErrors(errs);
      setStep(3);
    };
    reader.readAsText(f, 'UTF-8');
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) processFile(f);
  }, []);

  const nbOk      = resultats?.filter((r) => r.statut === 'OK').length ?? 0;
  const nbIgnores = resultats?.filter((r) => r.statut === 'IGNORE').length ?? 0;
  const nbErreurs = resultats?.filter((r) => r.statut === 'ERREUR').length ?? 0;

  return (
    <div className="space-y-5">
      <Stepper current={step} />

      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* Left — main */}
        <div className="flex-1 min-w-0 w-full space-y-4">

          {step === 1 && (
            /* ── Étape 1 : zone de dépôt ── */
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="text-[13px] font-semibold text-slate-900 mb-1">Modèle CSV</div>
              <p className="text-[12px] text-slate-500 mb-4">Téléchargez le modèle pour respecter le format attendu.</p>
              <button
                onClick={telechargerModele}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-[12px] text-slate-700 hover:bg-slate-50 transition-colors mb-6"
              >
                <Download size={13} />Télécharger le modèle CSV
              </button>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                  isDragOver ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Upload size={20} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-medium text-slate-700">Glissez votre fichier CSV ici</div>
                  <div className="text-[12px] text-slate-400 mt-0.5">ou cliquez pour sélectionner</div>
                </div>
                <div className="text-[11px] text-slate-300">CSV uniquement · max 500 lignes</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
            </div>
          )}

          {(step === 3 || step === 4) && file && (
            <>
              {/* Fichier téléversé */}
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] font-semibold text-slate-900">Fichier téléversé</div>
                  {step === 3 && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-[12px] text-[#4F46E5] hover:underline font-medium"
                    >
                      Changer de fichier
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">{file.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {rows.length} ligne{rows.length !== 1 ? 's' : ''} · {fmtSize(file.size)}
                    </div>
                  </div>
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
              </div>

              {step === 3 && (
                /* Aperçu mapping colonnes */
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="text-[13px] font-semibold text-slate-900 mb-0.5">Aperçu & mapping des colonnes</div>
                  <p className="text-[12px] text-slate-500 mb-4">
                    Vérifiez que TIKEXO a correctement détecté vos colonnes.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-[10px] text-slate-400 text-left py-2 pr-4 font-normal tracking-[0.5px] whitespace-nowrap">
                            COLONNE CSV → TIKEXO
                          </th>
                          {sampleRows.map((_, i) => (
                            <th key={i} className="text-[10px] text-slate-400 text-left py-2 px-3 font-normal tracking-[0.5px] whitespace-nowrap">
                              LIGNE {i + 2}
                            </th>
                          ))}
                          <th className="text-[10px] text-slate-400 text-left py-2 pl-3 font-normal tracking-[0.5px]">
                            STATUT
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {knownHeaders.map((h) => {
                          const field = CSV_HEADERS_MAP[h]!;
                          const label = FIELD_LABELS[field] ?? field;
                          const isRequired = ['prenom', 'nom', 'telephone', 'email'].includes(field);
                          return (
                            <tr key={h} className="border-b border-slate-50 last:border-0">
                              <td className="py-3 pr-4 whitespace-nowrap">
                                <span className="text-[12px] text-slate-500">{h}</span>
                                <span className="text-[12px] text-slate-300 mx-1.5">→</span>
                                <span className="text-[12px] font-semibold text-orange-500">{label}</span>
                                {isRequired && <span className="ml-1 text-[9px] text-red-400">*</span>}
                              </td>
                              {sampleRows.map((row, i) => (
                                <td key={i} className="py-3 px-3 text-[12px] text-slate-700 truncate max-w-[140px]">
                                  {row[field] || <span className="text-slate-300 italic">—</span>}
                                </td>
                              ))}
                              <td className="py-3 pl-3">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                                  <Check size={12} />OK
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Erreurs détectées */}
              {step === 3 && errors.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <div className="text-[13px] font-semibold text-slate-900">
                      {errors.length} erreur{errors.length > 1 ? 's' : ''} détectée{errors.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 mb-4">
                    Ces lignes ne seront pas importées tant qu'elles ne sont pas corrigées.
                  </p>
                  <div className="space-y-2">
                    {errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold whitespace-nowrap">
                          Ligne {err.ligne}
                        </span>
                        <div>
                          <div className="text-[12px] font-semibold text-slate-900">{err.titre}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{err.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats import */}
              {step === 4 && resultats && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="text-[13px] font-semibold text-slate-900 mb-4">Résultats de l'import</div>
                  <div className="space-y-1.5">
                    {resultats.map((r, i) => (
                      <div key={i} className={clsx(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl',
                        r.statut === 'OK' ? 'bg-green-50' : r.statut === 'IGNORE' ? 'bg-amber-50' : 'bg-red-50'
                      )}>
                        {r.statut === 'OK'
                          ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                          : r.statut === 'IGNORE'
                          ? <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                          : <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-medium text-slate-900">{r.prenom} {r.nom}</span>
                          <span className="text-[11px] text-slate-400 ml-2">{r.message}</span>
                        </div>
                        <span className={clsx('text-[10px] font-semibold',
                          r.statut === 'OK' ? 'text-green-600' : r.statut === 'IGNORE' ? 'text-amber-600' : 'text-red-500'
                        )}>
                          {r.statut === 'OK' ? '✓ OK' : r.statut === 'IGNORE' ? 'IGNORÉ' : 'ERREUR'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right — sidebar résumé */}
        <div className="w-full lg:w-[272px] flex-shrink-0 space-y-3">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="text-[13px] font-semibold text-slate-900 mb-4">Résumé</div>

            {step < 4 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Lignes lues</span>
                  <span className="text-[13px] font-semibold text-slate-900">{rows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">À créer</span>
                  <span className="text-[13px] font-semibold text-green-600">{valides.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Erreurs</span>
                  <span className="text-[13px] font-semibold text-red-500">{errors.length}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Importés</span>
                  <span className="text-[13px] font-semibold text-green-600">{nbOk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Ignorés</span>
                  <span className="text-[13px] font-semibold text-amber-600">{nbIgnores}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Erreurs</span>
                  <span className="text-[13px] font-semibold text-red-500">{nbErreurs}</span>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 mt-4 pt-4 space-y-2">
              {step === 1 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white text-[13px] font-semibold py-3 rounded-xl hover:bg-[#4338CA] transition-colors"
                >
                  <Upload size={14} />Téléverser un fichier
                </button>
              )}

              {step === 3 && (
                <>
                  {importMutation.isError && (
                    <div className="text-[11px] text-red-500 text-center mb-2">
                      {(importMutation.error as any)?.response?.data?.error || 'Erreur lors de l\'import'}
                    </div>
                  )}
                  <button
                    onClick={() => importMutation.mutate(valides)}
                    disabled={valides.length === 0 || importMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white text-[13px] font-semibold py-3 rounded-xl hover:bg-[#4338CA] disabled:opacity-40 transition-colors"
                  >
                    {importMutation.isPending
                      ? <><RefreshCw size={14} className="animate-spin" />Importation…</>
                      : <>Lancer l'import ({valides.length} ligne{valides.length !== 1 ? 's' : ''}) <ArrowRight size={14} /></>}
                  </button>
                  {errors.length > 0 && (
                    <div className="text-[11px] text-slate-400 text-center">
                      {errors.length} ligne{errors.length > 1 ? 's' : ''} avec erreur{errors.length > 1 ? 's' : ''} exclue{errors.length > 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <button
                    onClick={onFinish}
                    className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white text-[13px] font-semibold py-3 rounded-xl hover:bg-[#4338CA] transition-colors"
                  >
                    Voir les bénéficiaires <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => { setFile(null); setRows([]); setErrors([]); setResultats(null); setStep(1); importMutation.reset(); }}
                    className="w-full text-[12px] text-slate-500 py-2 hover:text-slate-700 transition-colors"
                  >
                    Nouvel import
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info format */}
          {step <= 2 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 tracking-[0.4px]">FORMAT CSV</div>
              <div className="space-y-1">
                {[
                  ['prenom', 'Obligatoire'],
                  ['nom', 'Obligatoire'],
                  ['telephone', 'Obligatoire · 8 ou 10 chiffres'],
                  ['email', "Obligatoire · reçoit le lien d'invitation"],
                  ['niveau', 'Optionnel · EMPLOYE par défaut'],
                  ['valeur_repas', 'Optionnel · défaut par niveau : 5k / 8k / 10k / 15k XOF'],
                ].map(([col, hint]) => (
                  <div key={col} className="flex items-start gap-2">
                    <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono flex-shrink-0">{col}</code>
                    <span className="text-[10px] text-slate-400 leading-tight pt-0.5">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
