import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Mail, ChevronDown, RotateCcw, Save, Info } from 'lucide-react';
import api from '../../lib/api';
import { fmtDateHeure } from '../../utils/format';

interface EmailTemplateRow {
  cle: string;
  label: string;
  variables: string[];
  personnalise: boolean;
  sujet: string | null;
  corps_html: string | null;
  corps_texte: string | null;
  updatedAt: string | null;
}

export default function AdminEmailTemplates() {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { sujet: string; corps_html: string; corps_texte: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: () => api.get('/admin/email-templates').then((r) => r.data.data as EmailTemplateRow[]),
  });

  const majMut = useMutation({
    mutationFn: ({ cle, form }: { cle: string; form: { sujet: string; corps_html: string; corps_texte: string } }) =>
      api.put(`/admin/email-templates/${cle}`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-email-templates'] }),
  });

  const resetMut = useMutation({
    mutationFn: (cle: string) => api.delete(`/admin/email-templates/${cle}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-email-templates'] }),
  });

  function ouvrir(t: EmailTemplateRow) {
    if (ouvert === t.cle) { setOuvert(null); return; }
    setOuvert(t.cle);
    if (!forms[t.cle]) {
      setForms((f) => ({
        ...f,
        [t.cle]: {
          sujet: t.sujet ?? '',
          corps_html: t.corps_html ?? `<p>Bonjour {{${t.variables[0] ?? 'prenom'}}},</p>\n<p>Votre message ici…</p>`,
          corps_texte: t.corps_texte ?? `Bonjour {{${t.variables[0] ?? 'prenom'}}},\n\nVotre message ici…`,
        },
      }));
    }
  }

  const templates = data ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={16} className="text-tikexo-primary" />
        <div className="text-[15px] font-medium text-slate-900">Emails personnalisables</div>
      </div>
      <div className="text-xs text-slate-500 mb-5">
        Modifiez le contenu de ces emails sans déploiement. Tant qu'aucune personnalisation n'est enregistrée, le modèle par défaut de l'application est utilisé.
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-slate-400 py-8">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const form = forms[t.cle];
            const estOuvert = ouvert === t.cle;
            return (
              <div key={t.cle} className="bg-white border border-slate-100 rounded-lg overflow-hidden">
                <button onClick={() => ouvrir(t)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="text-left">
                    <div className="text-xs font-medium text-slate-900">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t.personnalise ? `Personnalisé · modifié le ${fmtDateHeure(t.updatedAt!)}` : 'Modèle par défaut'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', t.personnalise ? 'bg-tikexo-primary/10 text-tikexo-primary' : 'bg-slate-100 text-slate-500')}>
                      {t.personnalise ? 'Personnalisé' : 'Par défaut'}
                    </span>
                    <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', estOuvert && 'rotate-180')} />
                  </div>
                </button>

                {estOuvert && form && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-1.5 bg-blue-50 text-blue-700 text-[11px] rounded-lg px-3 py-2">
                      <Info size={12} className="flex-shrink-0 mt-0.5" />
                      <span>Variables disponibles : {t.variables.map((v) => `{{${v}}}`).join(', ')}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Sujet</label>
                      <input
                        type="text"
                        value={form.sujet}
                        onChange={(e) => setForms((f) => ({ ...f, [t.cle]: { ...f[t.cle], sujet: e.target.value } }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Corps HTML</label>
                      <textarea
                        value={form.corps_html}
                        onChange={(e) => setForms((f) => ({ ...f, [t.cle]: { ...f[t.cle], corps_html: e.target.value } }))}
                        rows={8}
                        className="w-full font-mono text-xs resize-y border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Corps texte (email sans HTML)</label>
                      <textarea
                        value={form.corps_texte}
                        onChange={(e) => setForms((f) => ({ ...f, [t.cle]: { ...f[t.cle], corps_texte: e.target.value } }))}
                        rows={4}
                        className="w-full font-mono text-xs resize-y border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => majMut.mutate({ cle: t.cle, form })}
                        disabled={majMut.isPending}
                        className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-3.5 py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
                      >
                        <Save size={13} /> Enregistrer
                      </button>
                      {t.personnalise && (
                        <button
                          onClick={() => resetMut.mutate(t.cle)}
                          disabled={resetMut.isPending}
                          className="flex items-center gap-1.5 text-slate-500 border border-slate-200 text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <RotateCcw size={13} /> Revenir au modèle par défaut
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
