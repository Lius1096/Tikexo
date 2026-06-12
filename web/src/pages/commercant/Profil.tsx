import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Phone, MapPin, Percent, CreditCard, Shield } from 'lucide-react';
import api from '../../lib/api';

export default function CommercantProfil() {
  const { data: fiche, isLoading } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const rows = fiche ? [
    { icon: Store, label: 'Nom',            value: fiche.nom },
    { icon: Store, label: 'Type',           value: fiche.type },
    { icon: Phone, label: 'Mobile Money',   value: `${fiche.mobile_money_numero} (${fiche.mobile_money_operateur})` },
    { icon: MapPin, label: 'Adresse',       value: fiche.adresse ?? '—' },
    { icon: MapPin, label: 'Ville',         value: fiche.ville },
    { icon: Percent, label: 'Commission',   value: `${fiche.taux_commission}%` },
    { icon: CreditCard, label: 'Reversement', value: fiche.mode_reversement?.replace(/_/g, ' ') ?? '—' },
    { icon: Shield, label: 'Niveau',        value: fiche.niveau },
    { icon: Shield, label: 'Statut',        value: fiche.statut },
  ] : [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon profil</div>
        <div className="text-xs text-slate-500">Informations de votre boutique TIKEXO</div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-lg" />)}
        </div>
      ) : !fiche ? (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-sm text-slate-400">
          Profil commerçant introuvable.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Store size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Informations boutique</span>
          </div>
          <div className="divide-y divide-slate-50">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon size={13} className="text-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">{label}</span>
                <span className="text-xs text-slate-800 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
