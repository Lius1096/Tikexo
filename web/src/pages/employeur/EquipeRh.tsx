import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { UserPlus, Mail, Phone, Badge, X, AlertCircle, Trash2, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface MembreRh {
  id: string;
  role: 'ADMIN_RH' | 'GESTIONNAIRE_RH';
  matricule: string | null;
  createdAt: string;
  user: {
    id: string; nom: string; prenom: string; telephone: string;
    email_pro: string | null; statut: string; createdAt: string;
  };
}

interface InviteForm {
  prenom: string; nom: string; telephone: string;
  email_pro: string; matricule: string;
}

const FORM_VIDE: InviteForm = { prenom: '', nom: '', telephone: '', email_pro: '', matricule: '' };

const ROLE_LABEL: Record<string, string> = { ADMIN_RH: 'RH principal', GESTIONNAIRE_RH: 'Gestionnaire RH' };
const STATUT_LABEL: Record<string, { label: string; className: string }> = {
  ACTIF:  { label: 'Actif',       className: 'bg-[#ECFDF5] text-[#065F46]' },
  INACTIF:{ label: 'Invité·e',    className: 'bg-[#FFFBEB] text-[#92400E]' },
  BLOQUE: { label: 'Retiré·e',    className: 'bg-[#FEF2F2] text-[#991B1B]' },
};

export default function EquipeRh() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const qc = useQueryClient();
  const estAdminRh = user?.role === 'ADMIN_RH';

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(FORM_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['equipe-rh', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/equipe-rh`).then((r) => r.data.data as MembreRh[]),
    enabled: !!entrepriseId,
  });

  const inviterMutation = useMutation({
    mutationFn: () => api.post(`/entreprises/${entrepriseId}/rh`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipe-rh', entrepriseId] });
      setModalOpen(false); setForm(FORM_VIDE); setErreur(null);
    },
    onError: (err: any) => {
      setErreur(err?.response?.data?.error || 'Une erreur est survenue.');
    },
  });

  const retirerMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/entreprises/${entrepriseId}/rh/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipe-rh', entrepriseId] }),
  });

  const telValide = /^\d{8,10}$/.test(form.telephone.replace(/\D/g, ''));
  const formValide = telValide && !!form.prenom.trim() && !!form.nom.trim() && !!form.email_pro.trim();

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  const membres = data ?? [];

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="px-4 sm:px-6 pt-4 pb-4 bg-white border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Équipe RH</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Les comptes RH de votre entreprise et leurs actions sont tracés individuellement.
            </p>
          </div>
          {estAdminRh && (
            <button
              onClick={() => { setForm(FORM_VIDE); setErreur(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-[12px] font-medium hover:bg-[#4338CA] transition-colors self-start"
            >
              <UserPlus size={13} />Inviter un RH
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
          ) : membres.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">Aucun compte RH.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {membres.map((m) => {
                const statutInfo = STATUT_LABEL[m.user.statut] ?? { label: m.user.statut, className: 'bg-slate-100 text-slate-600' };
                const peutRetirer = estAdminRh && m.role !== 'ADMIN_RH' && m.user.statut !== 'BLOQUE';
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                      {`${m.user.prenom[0] ?? ''}${m.user.nom[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-900 truncate flex items-center gap-1.5">
                        {m.user.prenom} {m.user.nom}
                        {m.role === 'ADMIN_RH' && <ShieldCheck size={13} className="text-[#4F46E5] flex-shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {m.user.email_pro || m.user.telephone} · {ROLE_LABEL[m.role] ?? m.role}
                        {m.matricule && <> · Mat. {m.matricule}</>}
                      </div>
                    </div>
                    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', statutInfo.className)}>
                      {statutInfo.label}
                    </span>
                    {peutRetirer && (
                      <button
                        onClick={() => { if (confirm(`Retirer ${m.user.prenom} ${m.user.nom} de l'équipe RH ?`)) retirerMutation.mutate(m.user.id); }}
                        disabled={retirerMutation.isPending}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Retirer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Inviter un RH</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Un email d'invitation lui sera envoyé</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Prénom <span className="text-red-400">*</span></label>
                  <input type="text" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    placeholder="ex : Awa"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Nom <span className="text-red-400">*</span></label>
                  <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="ex : Koné"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Téléphone <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" inputMode="numeric" value={form.telephone}
                    onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="ex : 0197000000" maxLength={10}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Email professionnel <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={form.email_pro} onChange={(e) => setForm((f) => ({ ...f, email_pro: e.target.value }))}
                    placeholder="ex : awa@entreprise.com"
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Matricule <span className="text-slate-400 font-normal">(optionnel)</span></label>
                <div className="relative">
                  <Badge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={form.matricule} onChange={(e) => setForm((f) => ({ ...f, matricule: e.target.value }))}
                    placeholder="ex : RH-042"
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
                </div>
              </div>

              {erreur && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600">{erreur}</p>
                </div>
              )}

              <button
                onClick={() => inviterMutation.mutate()}
                disabled={!formValide || inviterMutation.isPending}
                className="w-full bg-[#4F46E5] text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40 hover:bg-[#4338CA] transition-colors"
              >
                {inviterMutation.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
