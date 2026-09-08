import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { UserPlus, Mail, Phone, X, AlertCircle, ShieldCheck, Lock, Unlock } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../utils/format';

interface AdminTikexo {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email_perso: string | null;
  email_pro: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN_OPS';
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE';
  createdAt: string;
}

interface InviteForm {
  prenom: string;
  nom: string;
  telephone: string;
  email_pro: string;
  role: 'SUPER_ADMIN' | 'ADMIN_OPS';
}

const FORM_VIDE: InviteForm = { prenom: '', nom: '', telephone: '', email_pro: '', role: 'ADMIN_OPS' };

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super administrateur', ADMIN_OPS: 'Administrateur opérations' };
const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  ACTIF:   { label: 'Actif',   cls: 'bg-green-50 text-green-700' },
  INACTIF: { label: 'Invité',  cls: 'bg-amber-50 text-amber-700' },
  BLOQUE:  { label: 'Bloqué',  cls: 'bg-red-50 text-red-500' },
};

export default function AdminEquipeTikexo() {
  const { user } = useAuth();
  const estSuperAdmin = user?.role === 'SUPER_ADMIN';
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(FORM_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-equipe-tikexo'],
    queryFn: () => api.get('/admin/utilisateurs', { params: { role: 'SUPER_ADMIN,ADMIN_OPS', limit: 100 } }).then((r) => r.data.data.items as AdminTikexo[]),
  });

  const inviterMut = useMutation({
    mutationFn: () => api.post('/admin/admins', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-equipe-tikexo'] });
      setModalOpen(false); setForm(FORM_VIDE); setErreur(null);
    },
    onError: (err: any) => setErreur(err?.response?.data?.error ?? 'Échec de l\'invitation, réessayez.'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/admins/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-equipe-tikexo'] }),
  });

  const bloquerMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/utilisateurs/${id}/bloquer`, { motif: 'Retiré de l\'équipe TIKEXO' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-equipe-tikexo'] }),
  });

  const debloquerMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/utilisateurs/${id}/debloquer`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-equipe-tikexo'] }),
  });

  const telValide = /^\d{8,10}$/.test(form.telephone.replace(/\D/g, ''));
  const formValide = telValide && !!form.prenom.trim() && !!form.nom.trim() && !!form.email_pro.trim();

  const membres = data ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Équipe TIKEXO</div>
          <div className="text-xs text-slate-500">Comptes admin ayant accès à cet espace</div>
        </div>
        {estSuperAdmin && (
          <button
            onClick={() => { setForm(FORM_VIDE); setErreur(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-tikexo-primary text-white text-xs font-medium hover:opacity-90 transition-opacity self-start"
          >
            <UserPlus size={13} /> Inviter un admin
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : membres.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">Aucun compte admin</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {membres.map((m) => {
              const st = STATUT_CFG[m.statut] ?? { label: m.statut, cls: 'bg-slate-100 text-slate-600' };
              const estMoi = m.id === user?.id;
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-tikexo-primary/10 text-tikexo-primary flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                    {`${m.prenom[0] ?? ''}${m.nom[0] ?? ''}`.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-slate-900 truncate flex items-center gap-1.5">
                      {m.prenom} {m.nom}
                      {m.role === 'SUPER_ADMIN' && <ShieldCheck size={13} className="text-tikexo-primary flex-shrink-0" />}
                      {estMoi && <span className="text-[10px] text-slate-400 font-normal">(vous)</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {m.email_perso || m.email_pro || m.telephone} · {fmtDate(m.createdAt)}
                    </div>
                  </div>

                  {estSuperAdmin ? (
                    <select
                      value={m.role}
                      disabled={roleMut.isPending || estMoi}
                      onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                      className="text-[11px] border border-slate-200 rounded-md px-2 py-1 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="SUPER_ADMIN">Super administrateur</option>
                      <option value="ADMIN_OPS">Administrateur opérations</option>
                    </select>
                  ) : (
                    <span className="text-[11px] text-slate-500">{ROLE_LABEL[m.role] ?? m.role}</span>
                  )}

                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', st.cls)}>{st.label}</span>

                  {!estMoi && m.statut !== 'INACTIF' && (
                    m.statut === 'BLOQUE' ? (
                      <button
                        onClick={() => debloquerMut.mutate(m.id)}
                        disabled={debloquerMut.isPending}
                        className="text-slate-300 hover:text-green-600 p-1.5 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0"
                        title="Débloquer"
                      >
                        <Unlock size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (confirm(`Bloquer l'accès de ${m.prenom} ${m.nom} ?`)) bloquerMut.mutate(m.id); }}
                        disabled={bloquerMut.isPending}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Bloquer"
                      >
                        <Lock size={14} />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Inviter un admin TIKEXO</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Un email d'invitation lui sera envoyé</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input type="text" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    placeholder="ex : Awa"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Nom</label>
                  <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="ex : Koné"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Téléphone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" inputMode="numeric" value={form.telephone}
                    onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="ex : 0197000000" maxLength={10}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Email professionnel</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={form.email_pro} onChange={(e) => setForm((f) => ({ ...f, email_pro: e.target.value }))}
                    placeholder="ex : awa@tikexo.kete.fr"
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as InviteForm['role'] }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                >
                  <option value="ADMIN_OPS">Administrateur opérations</option>
                  <option value="SUPER_ADMIN">Super administrateur</option>
                </select>
              </div>

              {erreur && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600">{erreur}</p>
                </div>
              )}

              <button
                onClick={() => inviterMut.mutate()}
                disabled={!formValide || inviterMut.isPending}
                className="w-full bg-tikexo-primary text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {inviterMut.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
