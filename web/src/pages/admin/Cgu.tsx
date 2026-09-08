import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Send, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { fmtDateHeure } from '../../utils/format';

interface CguVersion {
  id: string;
  version: number;
  contenu: string;
  createdAt: string;
  admin: { nom: string; prenom: string };
}

export default function AdminCgu() {
  const qc = useQueryClient();
  const [contenu, setContenu] = useState('');
  const [succes, setSucces] = useState(false);

  const { data: actuelle, isLoading } = useQuery({
    queryKey: ['admin-cgu-actuelle'],
    queryFn: () => api.get('/admin/cgu').then((r) => r.data.data as CguVersion | null),
  });

  const { data: historique } = useQuery({
    queryKey: ['admin-cgu-historique'],
    queryFn: () => api.get('/admin/cgu/historique').then((r) => r.data.data as CguVersion[]),
  });

  useEffect(() => {
    if (actuelle) setContenu(actuelle.contenu);
  }, [actuelle]);

  const publierMut = useMutation({
    mutationFn: () => api.post('/admin/cgu', { contenu }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cgu-actuelle'] });
      qc.invalidateQueries({ queryKey: ['admin-cgu-historique'] });
      setSucces(true);
      setTimeout(() => setSucces(false), 4000);
    },
  });

  function handlePublier() {
    const message = actuelle
      ? `Publier la version ${(actuelle.version + 1)} des CGU ? Elle remplacera immédiatement le texte affiché sur la page publique.`
      : 'Publier une première version personnalisée des CGU ? Elle remplacera le texte par défaut affiché aujourd\'hui.';
    if (!confirm(message)) return;
    publierMut.mutate();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-tikexo-primary" />
        <div className="text-[15px] font-medium text-slate-900">Conditions Générales d'Utilisation</div>
      </div>
      <div className="text-xs text-slate-500 mb-1">
        Modifiable sans déploiement. {actuelle ? `Version actuelle : v${actuelle.version}, publiée le ${fmtDateHeure(actuelle.createdAt)}.` : 'Aucune version personnalisée publiée — la page publique affiche le texte par défaut du code.'}
      </div>
      <a href="/cgu" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-tikexo-primary hover:underline mb-5">
        Voir la page publique <ExternalLink size={11} />
      </a>

      {isLoading ? (
        <div className="text-center text-sm text-slate-400 py-8">Chargement…</div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-lg p-5 space-y-4 mb-6">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
              Contenu (HTML) <span className="text-slate-400 font-normal">— utilisez des balises &lt;h2&gt; pour les titres de section et &lt;p&gt; pour les paragraphes</span>
            </label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder={!actuelle ? "Collez ici le texte complet des CGU (HTML) pour publier une première version personnalisée…" : undefined}
              rows={18}
              className="w-full font-mono text-xs resize-y border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
            />
          </div>

          {succes && <div className="text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">Nouvelle version publiée.</div>}

          <button
            onClick={handlePublier}
            disabled={!contenu.trim() || publierMut.isPending}
            className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2.5 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send size={13} /> {publierMut.isPending ? 'Publication…' : 'Publier cette version'}
          </button>
        </div>
      )}

      <div className="text-[13px] font-medium text-slate-900 mb-2">Historique des versions</div>
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        {!historique || historique.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Aucune version publiée pour l'instant</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historique.map((v) => (
              <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-700">Version {v.version}</span>
                <span className="text-[10px] text-slate-400">{fmtDateHeure(v.createdAt)} · {v.admin.prenom} {v.admin.nom}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
