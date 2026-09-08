import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Send, Megaphone, Building2, Users, Utensils, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { fmtDateHeure } from '../../utils/format';

interface Entreprise { id: string; nom: string }
interface BroadcastRow {
  id: string;
  cible: 'BENEFICIAIRES' | 'ENTREPRISES' | 'COMMERCANTS';
  entreprise_ids: string[];
  titre: string;
  corps: string;
  type: string;
  canaux: string[];
  nb_destinataires: number;
  createdAt: string;
  admin: { nom: string; prenom: string };
}

const CIBLES = [
  { value: 'BENEFICIAIRES', label: 'Bénéficiaires', icon: Users },
  { value: 'ENTREPRISES',   label: 'Entreprises',   icon: Building2 },
  { value: 'COMMERCANTS',   label: 'Commerçants',   icon: Utensils },
] as const;

const CIBLE_LABEL: Record<string, string> = { BENEFICIAIRES: 'Bénéficiaires', ENTREPRISES: 'Entreprises', COMMERCANTS: 'Commerçants' };

export default function AdminBroadcast() {
  const qc = useQueryClient();
  const [cible, setCible] = useState<typeof CIBLES[number]['value']>('BENEFICIAIRES');
  const [entrepriseIds, setEntrepriseIds] = useState<string[]>([]);
  const [titre, setTitre] = useState('');
  const [corps, setCorps] = useState('');
  const [type, setType] = useState<'SYSTEME' | 'MARKETING'>('SYSTEME');
  const [canaux, setCanaux] = useState<string[]>(['NOTIFICATION', 'EMAIL']);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const cibleEntreprisesActive = cible === 'BENEFICIAIRES' || cible === 'ENTREPRISES';

  const { data: entreprises } = useQuery({
    queryKey: ['admin-broadcast-entreprises'],
    queryFn: () => api.get('/entreprises', { params: { limit: 500 } }).then((r) => r.data.data.items as Entreprise[]),
    enabled: cibleEntreprisesActive,
  });

  const { data: historique } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => api.get('/admin/broadcast', { params: { limit: 20 } }).then((r) => r.data.data.items as BroadcastRow[]),
  });

  const envoyerMut = useMutation({
    mutationFn: () => api.post('/admin/broadcast', { cible, entrepriseIds, titre, corps, type, canaux }),
    onSuccess: (r) => {
      setSucces(`Envoyé à ${r.data.data.nb_destinataires} destinataire${r.data.data.nb_destinataires > 1 ? 's' : ''}.`);
      setErreur(null);
      setTitre(''); setCorps(''); setEntrepriseIds([]);
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      setTimeout(() => setSucces(null), 5000);
    },
    onError: (err: any) => setErreur(err?.response?.data?.error ?? 'Échec de l\'envoi, réessayez.'),
  });

  function toggleCanal(c: string) {
    setCanaux((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  }
  function toggleEntreprise(id: string) {
    setEntrepriseIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function handleEnvoyer() {
    const cibleTexte = entrepriseIds.length && cibleEntreprisesActive
      ? `${entrepriseIds.length} entreprise${entrepriseIds.length > 1 ? 's' : ''} sélectionnée${entrepriseIds.length > 1 ? 's' : ''}`
      : `tous les ${CIBLE_LABEL[cible].toLowerCase()}`;
    if (!confirm(`Envoyer ce message à ${cibleTexte} ? Cette action est irréversible.`)) return;
    envoyerMut.mutate();
  }

  const formValide = !!titre.trim() && !!corps.trim() && canaux.length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={16} className="text-tikexo-primary" />
        <div className="text-[15px] font-medium text-slate-900">Communication de masse</div>
      </div>
      <div className="text-xs text-slate-500 mb-5">Annonce d'un changement réel, panne, ou information importante</div>

      <div className="bg-white border border-slate-100 rounded-lg p-5 space-y-4 mb-6">
        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-2">Destinataires</label>
          <div className="grid grid-cols-3 gap-2">
            {CIBLES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setCible(value); setEntrepriseIds([]); }}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[11px] font-medium transition-colors',
                  cible === value ? 'border-tikexo-primary bg-tikexo-primary/5 text-tikexo-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {cibleEntreprisesActive && (
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
              Filtrer par entreprise <span className="text-slate-400 font-normal">(vide = toutes)</span>
            </label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
              {(entreprises ?? []).map((e) => (
                <label key={e.id} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={entrepriseIds.includes(e.id)} onChange={() => toggleEntreprise(e.id)} className="accent-tikexo-primary" />
                  {e.nom}
                </label>
              ))}
              {entreprises?.length === 0 && <div className="px-3 py-3 text-xs text-slate-400">Aucune entreprise</div>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Titre</label>
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="ex : Nouvelle fonctionnalité de retrait"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Message</label>
          <textarea
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            placeholder="Décrivez le changement ou l'information à communiquer…"
            rows={5}
            className="w-full resize-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'SYSTEME' | 'MARKETING')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
            >
              <option value="SYSTEME">Annonce officielle</option>
              <option value="MARKETING">Marketing / promo</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Canaux</label>
            <div className="flex items-center gap-4 h-[42px]">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={canaux.includes('NOTIFICATION')} onChange={() => toggleCanal('NOTIFICATION')} className="accent-tikexo-primary" />
                In-app
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={canaux.includes('EMAIL')} onChange={() => toggleCanal('EMAIL')} className="accent-tikexo-primary" />
                Email
              </label>
            </div>
          </div>
        </div>

        {succes && (
          <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> {succes}
          </div>
        )}
        {erreur && <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erreur}</div>}

        <button
          onClick={handleEnvoyer}
          disabled={!formValide || envoyerMut.isPending}
          className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2.5 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send size={13} /> {envoyerMut.isPending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>

      <div className="text-[13px] font-medium text-slate-900 mb-2">Historique</div>
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        {!historique || historique.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Aucune communication envoyée pour l'instant</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historique.map((b) => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-slate-900">{b.titre}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtDateHeure(b.createdAt)}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {CIBLE_LABEL[b.cible]} · {b.nb_destinataires} destinataire{b.nb_destinataires > 1 ? 's' : ''} · {b.admin.prenom} {b.admin.nom}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
