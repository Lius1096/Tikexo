import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Save, X, Loader2, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const TYPES_PLAFOND: { key: 'SOLDE_WALLET' | 'RECHARGE_MENSUEL'; label: string; champ: 'montant_max_wallet' | 'plafond_recharge_mensuel' }[] = [
  { key: 'SOLDE_WALLET', label: 'Plafond de solde wallet', champ: 'montant_max_wallet' },
  { key: 'RECHARGE_MENSUEL', label: 'Plafond de recharge mensuel', champ: 'plafond_recharge_mensuel' },
];

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
      setErreur(err?.response?.data?.error ?? 'Erreur lors de la mise à jour.');
    },
  });

  const CHAMPS_READONLY = [
    { label: 'Nom', value: data?.nom },
    { label: 'IFU', value: data?.ifu },
    { label: 'RCCM', value: data?.rccm ?? '—' },
    { label: 'Statut', value: data?.statut },
    { label: 'KYB', value: data?.kyb_valide ? 'Validé' : 'En attente' },
  ];

  // Plafonds — solde wallet et flux de recharge mensuel. Modifiables
  // uniquement via une demande soumise ici et validée par un admin TIKEXO
  // (voir entreprise.service.js#modifier, qui bloque ces champs pour les
  // rôles employeur).
  const { data: demandes } = useQuery({
    queryKey: ['demandes-plafond', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/demandes-plafond`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const [demandeOuverte, setDemandeOuverte] = useState<null | 'SOLDE_WALLET' | 'RECHARGE_MENSUEL'>(null);
  const [montantDemande, setMontantDemande] = useState('');
  const [justification, setJustification] = useState('');
  const [erreurDemande, setErreurDemande] = useState<string | null>(null);

  const demandeMutation = useMutation({
    mutationFn: () =>
      api.post(`/entreprises/${entrepriseId}/demandes-plafond`, {
        type: demandeOuverte,
        montant_demande: montantDemande,
        justification,
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes-plafond', entrepriseId] });
      setDemandeOuverte(null);
      setMontantDemande('');
      setJustification('');
      setErreurDemande(null);
    },
    onError: (err: any) => {
      setErreurDemande(err?.response?.data?.error ?? 'Erreur lors de la demande.');
    },
  });

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
        <>
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

        <div className="bg-white border border-slate-100 rounded-lg mt-4">
          <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
            <TrendingUp size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Plafonds</span>
          </div>
          <div className="text-[11px] text-slate-500 px-4 pt-3">
            Modifiables uniquement sur validation d'un admin TIKEXO — soumettez une demande ci-dessous.
          </div>

          {erreurDemande && (
            <div className="mx-4 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreurDemande}</div>
          )}

          <div className="px-4 py-2">
            {TYPES_PLAFOND.map(({ key, label, champ }) => {
              const valeurActuelle = data?.[champ];
              const derniereDemande = (demandes ?? []).find((d: any) => d.type === key);
              const enAttente = derniereDemande?.statut === 'EN_ATTENTE';

              return (
                <div key={key} className="py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] text-slate-500">{label}</div>
                      <div className="text-xs text-slate-900 font-medium mt-0.5">
                        {valeurActuelle ? `${Number(valeurActuelle).toLocaleString('fr-FR')} XOF` : 'Non défini'}
                      </div>
                      {derniereDemande && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                          {derniereDemande.statut === 'EN_ATTENTE' && (
                            <span className="flex items-center gap-1 text-amber-600"><Clock size={11} /> Demande en attente — {Number(derniereDemande.montant_demande).toLocaleString('fr-FR')} XOF demandés</span>
                          )}
                          {derniereDemande.statut === 'APPROUVEE' && (
                            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} /> Dernière demande approuvée</span>
                          )}
                          {derniereDemande.statut === 'REJETEE' && (
                            <span className="flex items-center gap-1 text-red-500"><XCircle size={11} /> Demande refusée{derniereDemande.note_admin ? ` — ${derniereDemande.note_admin}` : ''}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {!enAttente && demandeOuverte !== key && (
                      <button
                        onClick={() => { setDemandeOuverte(key); setMontantDemande(''); setJustification(''); setErreurDemande(null); }}
                        className="flex-shrink-0 text-[11px] text-tikexo-primary border border-tikexo-primary/30 rounded-lg px-3 py-1.5 hover:bg-tikexo-primary/5 transition-colors"
                      >
                        Demander une augmentation
                      </button>
                    )}
                  </div>

                  {demandeOuverte === key && (
                    <div className="mt-2.5 space-y-2 bg-slate-50 rounded-lg p-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="Nouveau montant souhaité (XOF)"
                        value={montantDemande}
                        onChange={(e) => setMontantDemande(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-tikexo-primary"
                      />
                      <textarea
                        placeholder="Justification (optionnel)"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={2}
                        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-tikexo-primary resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => demandeMutation.mutate()}
                          disabled={!montantDemande || demandeMutation.isPending}
                          className="flex items-center gap-1.5 bg-tikexo-primary text-white text-[11px] font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {demandeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                          Envoyer la demande
                        </button>
                        <button
                          onClick={() => { setDemandeOuverte(null); setErreurDemande(null); }}
                          className="text-[11px] text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
