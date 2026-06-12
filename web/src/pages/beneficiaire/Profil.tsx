import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Building2, Phone, Mail, Shield } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function BeneficiaireProfil() {
  const { user } = useAuth();

  const { data: profil, isLoading } = useQuery({
    queryKey: ['beneficiaire-profil'],
    queryFn: () => api.get('/auth/profil').then((r) => r.data.data),
  });

  const lien = profil?.liensBeneficiaire?.[0];

  const rows = profil ? [
    { icon: User, label: 'Nom complet', value: `${profil.prenom} ${profil.nom}` },
    { icon: Phone, label: 'Téléphone', value: profil.telephone },
    { icon: Mail, label: 'Email perso', value: profil.email_perso ?? '—' },
    { icon: Mail, label: 'Email pro', value: profil.email_pro ?? '—' },
    { icon: Shield, label: 'Statut', value: profil.statut },
    { icon: Shield, label: 'KYC', value: profil.kyc_niveau },
  ] : [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon profil</div>
        <div className="text-xs text-slate-500">Vos informations personnelles</div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Infos personnelles */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <span className="text-[13px] font-medium text-slate-900">Informations personnelles</span>
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

          {/* Entreprise liée */}
          {lien && (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                <span className="text-[13px] font-medium text-slate-900">Entreprise</span>
              </div>
              <div className="divide-y divide-slate-50">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Building2 size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Nom</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.entreprise?.nom}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Niveau</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.niveau}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Statut lien</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.statut}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
