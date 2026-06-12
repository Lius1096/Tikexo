import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Settings } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeurParametres() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;

  const { data, isLoading } = useQuery({
    queryKey: ['entreprise-detail', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  return (
    <div className="p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Paramètres</div>
      <div className="text-xs text-slate-500 mb-4">Informations et configuration de l'entreprise</div>

      {!entrepriseId ? (
        <div className="bg-white border border-slate-100 rounded-lg py-12 text-center text-sm text-slate-400">
          Profil non rattaché à une entreprise.
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-lg">
          <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
            <Building2 size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Informations entreprise</span>
          </div>
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
          ) : data ? (
            <div className="px-4 py-4 space-y-3">
              {[
                { label: 'Nom', value: data.nom },
                { label: 'NIF', value: data.nif },
                { label: 'RCCM', value: data.rccm ?? '—' },
                { label: 'Secteur', value: data.secteur ?? '—' },
                { label: 'Adresse', value: data.adresse ?? '—' },
                { label: 'Ville', value: data.ville },
                { label: 'Téléphone RH', value: data.telephone_rh ?? '—' },
                { label: 'Email RH', value: data.email_rh ?? '—' },
                { label: 'Statut', value: data.statut },
                { label: 'KYB', value: data.kyb_valide ? 'Validé' : 'En attente' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <div className="text-[11px] text-slate-500 w-28 flex-shrink-0">{label}</div>
                  <div className="text-xs text-slate-900">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
