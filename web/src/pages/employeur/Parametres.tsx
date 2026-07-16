import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Save, X, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const CHAMPS_EDITABLES = [
  { key: 'secteur',       label: 'Secteur',       type: 'text' },
  { key: 'adresse',       label: 'Adresse',       type: 'text' },
  { key: 'ville',         label: 'Ville',         type: 'text' },
  { key: 'telephone_rh', label: 'Téléphone RH', type: 'tel'  },
  { key: 'email_rh',     label: 'Email RH',     type: 'email'},
];

export default function EmployeurParametres() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const entrepriseId = user?.entrepriseId;

  const { data, isLoading } = useQuery({
    queryKey: ['entreprise-detail', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        secteur:       data.secteur      ?? '',
        adresse:       data.adresse      ?? '',
        ville:         data.ville        ?? '',
        telephone_rh:  data.telephone_rh ?? '',
        email_rh:      data.email_rh     ?? '',
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => api.put(`/entreprises/${entrepriseId}`, form).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entreprise-detail', entrepriseId] });
      setEditing(false);
      setSucces(true);
      setErreur(null);
      setTimeout(() => setSucces(false), 3000);
    },
    onError: (err: any) => {
      setErreur(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    },
  });

  const CHAMPS_READONLY = [
    { label: 'Nom', value: data?.nom },
    { label: 'NIF', value: data?.nif },
    { label: 'RCCM', value: data?.rccm ?? '—' },
    { label: 'Statut', value: data?.statut },
    { label: 'KYB', value: data?.kyb_valide ? 'Validé' : 'En attente' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[15px] font-medium text-slate-900">Paramètres</div>
        {!isLoading && data && !editing && (
          <button
            onClick={() => { setEditing(true); setSucces(false); }}
            className="flex items-center gap-1.5 text-[11px] text-tikexo-primary border border-tikexo-primary/30 rounded-lg px-3 py-1.5 hover:bg-tikexo-primary/5 transition-colors"
          >
            <Pencil size={12} /> Modifier
          </button>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-4">Informations et configuration de l'entreprise</div>

      {succes && (
        <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Informations mises à jour avec succès.
        </div>
      )}
      {erreur && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</div>
      )}

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
            <div className="px-4 py-4 space-y-2">
              {CHAMPS_READONLY.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-4 py-1.5 border-b border-slate-50">
                  <div className="text-[11px] text-slate-500 w-28 flex-shrink-0">{label}</div>
                  <div className="text-xs text-slate-900">{value}</div>
                </div>
              ))}

              <div className="pt-2 pb-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Informations modifiables</div>
              </div>

              {CHAMPS_EDITABLES.map(({ key, label, type }) => (
                <div key={key} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <div className="text-[11px] text-slate-500 w-28 flex-shrink-0">{label}</div>
                  {editing ? (
                    <input
                      type={type}
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-tikexo-primary"
                    />
                  ) : (
                    <div className="text-xs text-slate-900">{(data as any)[key] ?? '—'}</div>
                  )}
                </div>
              ))}

              {editing && (
                <div className="flex items-center gap-2 pt-3">
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => { setEditing(false); setErreur(null); }}
                    className="flex items-center gap-1.5 text-slate-500 text-xs border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <X size={13} /> Annuler
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
