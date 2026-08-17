import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, Clock, Utensils, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { TYPE_COMMERCANT_LABELS } from '../../lib/commercantConstants';

interface FichePublique {
  id: string;
  nom: string;
  type: string;
  ville: string;
  adresse: string | null;
  photo_url: string | null;
  note_moyenne: number;
  est_ouvert: boolean;
}

export default function CommercantVitrine() {
  const { id } = useParams<{ id: string }>();

  const { data: fiche, isLoading, isError } = useQuery({
    queryKey: ['commercant-public', id],
    queryFn: () => api.get<{ data: FichePublique }>(`/commercants/${id}/public`).then((r) => r.data.data),
    enabled: !!id,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-tikexo-light-gray flex flex-col items-center px-4 py-10">
      <Link to="/" className="text-tikexo-primary font-bold tracking-[2px] text-lg mb-8">
        TIKEXO
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="w-full h-40 bg-slate-100 animate-pulse rounded-2xl" />
            <div className="h-5 w-2/3 bg-slate-100 animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-slate-100 animate-pulse rounded" />
          </div>
        ) : isError || !fiche ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <Utensils size={22} className="text-slate-300" />
            </div>
            <div className="text-sm font-medium text-slate-700">Commerçant introuvable</div>
            <div className="text-xs text-slate-400">Cet établissement n'est plus disponible sur TIKEXO.</div>
          </div>
        ) : (
          <>
            {fiche.photo_url ? (
              <img src={fiche.photo_url} alt={fiche.nom} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 bg-gradient-to-br from-tikexo-primary to-tikexo-accent flex items-center justify-center">
                <Utensils size={36} className="text-white/70" />
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <div className="text-[20px] font-bold text-slate-900 leading-tight">{fiche.nom}</div>
                <div className="text-[12px] text-slate-400 mt-0.5">
                  {TYPE_COMMERCANT_LABELS[fiche.type] ?? fiche.type} · {fiche.ville}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                    fiche.est_ouvert ? 'bg-[#EAF3DE] text-[#166534]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Clock size={11} /> {fiche.est_ouvert ? 'Ouvert maintenant' : 'Fermé actuellement'}
                </span>
                {fiche.note_moyenne > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                    <Star size={11} fill="currentColor" /> {fiche.note_moyenne.toFixed(1)}
                  </span>
                )}
              </div>

              {fiche.adresse && (
                <div className="flex items-start gap-2 text-[12px] text-slate-500">
                  <MapPin size={13} className="flex-shrink-0 mt-0.5 text-slate-400" />
                  {fiche.adresse}, {fiche.ville}
                </div>
              )}

              <div className="flex items-start gap-2.5 bg-tikexo-light-blue/40 border border-tikexo-accent/20 rounded-xl px-3.5 py-3">
                <ShieldCheck size={16} className="text-tikexo-accent flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-tikexo-primary leading-relaxed">
                  <strong className="font-semibold">Accepté chez TIKEXO.</strong> Ce commerçant accepte les titres-repas digitaux TIKEXO — pratique pour les salariés des entreprises partenaires.
                </div>
              </div>

              <a
                href="/"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-tikexo-primary text-white text-[12px] font-medium hover:bg-tikexo-accent transition-colors"
              >
                Découvrir TIKEXO <ArrowRight size={13} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
