import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Users, X, Wallet, CalendarDays, ChevronRight, Plus, Phone, AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt, fmtDate } from '../../utils/format';

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];
const NIVEAUX = [
  { value: 'EMPLOYE',   label: 'Employé' },
  { value: 'CADRE',     label: 'Cadre' },
  { value: 'MANAGER',   label: 'Manager' },
  { value: 'DIRECTEUR', label: 'Directeur' },
];
const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé', CADRE: 'Cadre', MANAGER: 'Manager', DIRECTEUR: 'Directeur',
};
const statutDotBadge: Record<string, string> = {
  CALCULE:   'bg-[#FAEEDA] text-[#854F0B]',
  VALIDE:    'bg-[#EAF3DE] text-[#3B6D11]',
  DISTRIBUE: 'bg-[#DBEAFE] text-[#185FA5]',
};
const statutDotLabel: Record<string, string> = {
  CALCULE: 'À valider', VALIDE: 'Validé', DISTRIBUE: 'Distribué',
};
interface BenefItem {
  id: string;
  niveau: string;
  statut: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    email_perso?: string;
    statut: string;
    wallet?: { solde: string; currency: string };
  };
}

interface DotationItem {
  id: string;
  statut: string;
  montant_total: string;
  part_employeur: string;
  part_salarie: string;
  nb_titres: number;
  mois_concerne: string;
  distribue_at?: string | null;
  createdAt: string;
}

interface AjoutForm {
  prenom: string;
  nom: string;
  telephone: string;
  email_perso: string;
  niveau: string;
  valeur_titre: string;
  taux_participation: string;
}

const FORM_VIDE: AjoutForm = {
  prenom: '',
  nom: '',
  telephone: '',
  email_perso: '',
  niveau: 'EMPLOYE',
  valeur_titre: '1500',
  taux_participation: '100',
};

export default function EmployeurBeneficiaires() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AjoutForm>(FORM_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [utilisateurExistant, setUtilisateurExistant] = useState<{ id: string; nom: string; prenom: string } | null>(null);
  const checkTelRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaires-entreprise', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/beneficiaires`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const ajoutMutation = useMutation({
    mutationFn: async (f: AjoutForm) => {
      // 1. Créer le compte salarié
      const { data: creerRes } = await api.post('/beneficiaires', {
        prenom: f.prenom.trim(),
        nom: f.nom.trim(),
        telephone: f.telephone.replace(/\D/g, ''),
        email_perso: f.email_perso.trim() || undefined,
      });
      const userId = creerRes.data.id;
      // 2. Rattacher à l'entreprise
      await api.post(`/beneficiaires/${userId}/rattacher`, {
        entrepriseId,
        niveau: f.niveau,
        valeurTitre: parseFloat(f.valeur_titre) || 1500,
        tauxParticipation: parseFloat(f.taux_participation) || 100,
      });
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      setModalOpen(false);
      setForm(FORM_VIDE);
      setErreur(null);
    },
    onError: (err: any) => {
      const raw: string = err?.response?.data?.error || err?.response?.data?.message || '';
      const status: number = err?.response?.status;
      let msg = 'Une erreur inattendue est survenue. Veuillez réessayer.';
      if (status === 409 || raw.toLowerCase().includes('déjà actif')) {
        msg = 'Ce salarié est déjà enregistré et actif dans votre entreprise.';
      } else if (raw.toLowerCase().includes('rôle') || raw.toLowerCase().includes('role')) {
        msg = 'Ce numéro appartient à un compte non-salarié (RH, admin…). Il ne peut pas être ajouté comme bénéficiaire.';
      } else if (status === 403) {
        msg = "Vous n'avez pas les droits pour effectuer cette action.";
      } else if (status === 404) {
        msg = 'Salarié introuvable. Vérifiez le numéro de téléphone.';
      } else if (raw) {
        msg = raw;
      }
      setErreur(msg);
    },
  });

  const items: BenefItem[] = data || [];
  const selected = items.find((b) => b.id === selectedId) ?? null;

  const telValide = /^\d{10}$/.test(form.telephone.replace(/\D/g, ''));
  const formValide = telValide && (utilisateurExistant || (form.prenom.trim() && form.nom.trim()));

  function patchForm(p: Partial<AjoutForm>) {
    setForm((f) => ({ ...f, ...p }));
    setErreur(null);
    if (p.telephone !== undefined) {
      setUtilisateurExistant(null);
      if (checkTelRef.current) clearTimeout(checkTelRef.current);
      const tel = p.telephone.replace(/\D/g, '');
      if (/^\d{10}$/.test(tel)) {
        checkTelRef.current = setTimeout(async () => {
          try {
            const { data } = await api.post('/beneficiaires/rechercher-telephone', { telephone: tel });
            const found = data.data;
            if (found) {
              const dejaDansEntreprise = items.some((b) => b.user.id === found.id);
              if (!dejaDansEntreprise) {
                setUtilisateurExistant({ id: found.id, nom: found.nom, prenom: found.prenom });
                setForm((f) => ({ ...f, nom: found.nom, prenom: found.prenom }));
              }
            }
          } catch { /* pas trouvé — nouveau salarié */ }
        }, 500);
      }
    }
  }

  function ouvrirModal() {
    setForm(FORM_VIDE);
    setErreur(null);
    setUtilisateurExistant(null);
    setModalOpen(true);
  }

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Bénéficiaires</div>
          <div className="text-xs text-slate-500">{items.length} salarié{items.length > 1 ? 's' : ''} actif{items.length > 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={ouvrirModal}
          className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-tikexo-primary/90 transition-colors"
        >
          <Plus size={14} />
          Ajouter un salarié
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['NOM', 'TÉLÉPHONE', 'NIVEAU', 'SOLDE TIKEXO', 'STATUT', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users size={20} className="text-slate-300" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Aucun salarié enregistré</div>
                      <div className="text-xs text-slate-400 mt-0.5">Ajoutez vos salariés pour leur distribuer des dotations</div>
                    </div>
                    <button
                      onClick={ouvrirModal}
                      className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-tikexo-primary/90 transition-colors"
                    >
                      <Plus size={13} />
                      Ajouter le premier salarié
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((b, idx) => {
                const [bg, fg] = PALETTE[idx % PALETTE.length];
                const initials = `${b.user.prenom[0] ?? ''}${b.user.nom[0] ?? ''}`.toUpperCase();
                const solde = Number(b.user.wallet?.solde || 0);
                const statutClass = b.user.statut === 'ACTIF'
                  ? 'bg-[#EAF3DE] text-[#3B6D11]'
                  : b.user.statut === 'BLOQUE'
                  ? 'bg-[#FCEBEB] text-[#A32D2D]'
                  : 'bg-[#FAEEDA] text-[#854F0B]';
                const statutTxt = b.user.statut === 'ACTIF' ? 'Actif'
                  : b.user.statut === 'INACTIF' ? 'En attente'
                  : b.user.statut === 'BLOQUE' ? 'Bloqué' : b.user.statut;

                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    className={clsx(
                      'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                      selectedId === b.id ? 'bg-slate-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ background: bg, color: fg }}>
                          {initials}
                        </div>
                        <div className="text-xs font-medium text-slate-900">{b.user.prenom} {b.user.nom}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.user.telephone}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-[10px]">
                        {niveauLabel[b.niveau] ?? b.niveau}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">{fmt(solde)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutClass)}>
                        {statutTxt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === b.id && 'rotate-90')} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <BenefDrawer
          benef={selected}
          entrepriseId={entrepriseId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Modal ajout salarié */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-medium text-slate-900">
                  {utilisateurExistant ? 'Ré-embauche' : 'Ajouter un salarié'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {utilisateurExistant ? 'Réactivation du lien entreprise' : 'Compte TIKEXO créé automatiquement'}
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Prénom <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(e) => patchForm({ prenom: e.target.value })}
                    placeholder="ex : Kofi"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => patchForm({ nom: e.target.value })}
                    placeholder="ex : Mensah"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Téléphone Mobile Money <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.telephone}
                    onChange={(e) => patchForm({ telephone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="ex : 0197000000"
                    maxLength={10}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                  />
                </div>
                {form.telephone.length > 0 && !telValide && (
                  <p className="text-[11px] text-red-500 mt-1">10 chiffres requis (nouveau format Bénin)</p>
                )}
              </div>

              {/* Bannière ré-embauche */}
              {utilisateurExistant && (
                <div className="flex items-start gap-2.5 bg-[#EAF3DE] border border-[#B7DDA0] rounded-xl px-4 py-3">
                  <RefreshCw size={14} className="text-[#3B6D11] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[12px] font-semibold text-[#3B6D11]">Ré-embauche détectée</div>
                    <div className="text-[11px] text-[#3B6D11]/80 mt-0.5">
                      <strong>{utilisateurExistant.prenom} {utilisateurExistant.nom}</strong> est déjà enregistré(e) dans TIKEXO.
                      Son compte et sa carte virtuelle seront conservés — seul le lien avec votre entreprise sera réactivé.
                    </div>
                  </div>
                </div>
              )}

              {/* Email perso */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email personnel <span className="text-slate-400 font-normal">(optionnel)</span></label>
                <input
                  type="email"
                  value={form.email_perso}
                  onChange={(e) => patchForm({ email_perso: e.target.value })}
                  placeholder="ex : kofi@gmail.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                />
              </div>

              {/* Niveau */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Niveau</label>
                <div className="grid grid-cols-4 gap-2">
                  {NIVEAUX.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => patchForm({ niveau: n.value })}
                      className={clsx(
                        'text-[11px] font-medium py-2 rounded-lg border transition-colors',
                        form.niveau === n.value
                          ? 'bg-tikexo-primary text-white border-tikexo-primary'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-tikexo-primary'
                      )}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valeur titre + Taux participation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Valeur par repas (XOF)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.valeur_titre}
                    onChange={(e) => patchForm({ valeur_titre: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Part employeur (%)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={form.taux_participation}
                    onChange={(e) => patchForm({ taux_participation: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                  />
                </div>
              </div>

              {erreur && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600">{erreur}</p>
                </div>
              )}

              <button
                onClick={() => ajoutMutation.mutate(form)}
                disabled={!formValide || ajoutMutation.isPending}
                className="w-full bg-tikexo-primary text-white text-sm font-medium py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tikexo-primary/90 transition-colors"
              >
                {ajoutMutation.isPending
                  ? (utilisateurExistant ? 'Réactivation en cours…' : 'Création en cours…')
                  : (utilisateurExistant ? 'Confirmer la ré-embauche' : 'Ajouter le salarié')}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BenefDrawer({
  benef, entrepriseId, onClose,
}: {
  benef: BenefItem;
  entrepriseId: string;
  onClose: () => void;
}) {
  const u = benef.user;
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();
  const solde = Number(u.wallet?.solde || 0);
  const queryClient = useQueryClient();
  const [sortieOpen, setSortieOpen] = useState(false);
  const [optionSolde, setOptionSolde] = useState<'CONSERVATION' | 'REMBOURSEMENT'>('CONSERVATION');
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState('');

  const rechargeMut = useMutation({
    mutationFn: () => api.post('/wallet/crediter-benef', {
      entrepriseId,
      beneficiaireId: u.id,
      montant: parseInt(montantRecharge.replace(/\D/g, ''), 10),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      queryClient.invalidateQueries({ queryKey: ['employeur-wallet', entrepriseId] });
      queryClient.invalidateQueries({ queryKey: ['employeur-stats', entrepriseId] });
      setRechargeOpen(false);
      setMontantRecharge('');
    },
  });

  const sortieMut = useMutation({
    mutationFn: () => api.post(`/beneficiaires/${u.id}/sortie`, { entrepriseId, optionSolde }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      setSortieOpen(false);
      onClose();
    },
  });

  const { data: dotData, isLoading } = useQuery({
    queryKey: ['dotations-benef', entrepriseId, u.id],
    queryFn: () =>
      api.get(`/dotations?entrepriseId=${entrepriseId}&beneficiaireId=${u.id}&limit=12`)
        .then((r) => r.data.data),
    staleTime: 30_000,
  });

  const dotations: DotationItem[] = dotData?.items || [];

  const statutClass = u.statut === 'ACTIF'
    ? 'bg-[#EAF3DE] text-[#3B6D11]'
    : u.statut === 'BLOQUE'
    ? 'bg-[#FCEBEB] text-[#A32D2D]'
    : 'bg-[#FAEEDA] text-[#854F0B]';
  const statutTxt = u.statut === 'ACTIF' ? 'Actif' : u.statut === 'BLOQUE' ? 'Bloqué' : 'En attente';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[380px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[13px] font-medium text-[#185FA5]">
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{u.prenom} {u.nom}</div>
              <div className="text-[11px] text-slate-400 font-mono">{u.telephone}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Modal sortie */}
        {sortieOpen && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-medium text-slate-900">Sortie de l'entreprise</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{u.prenom} {u.nom}</div>
              </div>
              <button onClick={() => setSortieOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-5 space-y-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[11px] text-amber-800">
                Cette action est irréversible. Le lien entre <strong>{u.prenom} {u.nom}</strong> et votre entreprise sera clôturé.
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700 mb-3">Que faire avec le solde TIKEXO restant ?</div>
                <div className="space-y-2.5">
                  {([
                    { val: 'CONSERVATION', title: 'Conserver', desc: `L'employé garde ses ${fmt(solde)} et peut continuer à les dépenser chez nos commerçants pendant 90 jours.` },
                    { val: 'REMBOURSEMENT', title: 'Rembourser', desc: `Les ${fmt(solde)} sont remboursés via Mobile Money. Le solde de l'employé sera à 0.` },
                  ] as const).map(({ val, title, desc }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOptionSolde(val)}
                      className={clsx(
                        'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors',
                        optionSolde === val
                          ? 'border-tikexo-primary bg-tikexo-primary/5'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={clsx(
                          'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0',
                          optionSolde === val ? 'border-tikexo-primary bg-tikexo-primary' : 'border-slate-300'
                        )} />
                        <span className="text-[12px] font-medium text-slate-900">{title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-2">
              {sortieMut.isError && (
                <div className="text-[11px] text-red-500 text-center">{(sortieMut.error as any)?.response?.data?.message || 'Erreur lors de la sortie'}</div>
              )}
              <button
                onClick={() => sortieMut.mutate()}
                disabled={sortieMut.isPending}
                className="w-full bg-red-600 text-white text-sm font-medium py-3 rounded-xl disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {sortieMut.isPending ? 'Traitement en cours…' : 'Confirmer la sortie'}
              </button>
              <button onClick={() => setSortieOpen(false)} className="w-full text-slate-500 text-sm py-2 hover:text-slate-700">Annuler</button>
            </div>
          </div>
        )}

        {/* Modal rechargement individuel */}
        {rechargeOpen && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-medium text-slate-900">Recharger le solde</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{u.prenom} {u.nom}</div>
              </div>
              <button onClick={() => { setRechargeOpen(false); setMontantRecharge(''); }} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Solde actuel</span>
                <span className="font-mono text-sm font-semibold text-slate-900">{fmt(solde)}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Montant à créditer (XOF)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montantRecharge}
                  onChange={(e) => setMontantRecharge(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex : 5000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                />
                <div className="flex gap-2 mt-2">
                  {[2500, 5000, 10000].map((v) => (
                    <button key={v} type="button" onClick={() => setMontantRecharge(String(v))}
                      className="flex-1 text-xs border border-slate-200 rounded-lg py-1.5 text-slate-600 hover:border-tikexo-primary hover:text-tikexo-primary transition-colors">
                      {fmt(v)}
                    </button>
                  ))}
                </div>
              </div>
              {rechargeMut.isError && (
                <div className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {(rechargeMut.error as any)?.response?.data?.message || 'Erreur lors du rechargement'}
                </div>
              )}
              {rechargeMut.isSuccess && (
                <div className="text-[11px] text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  Solde crédité avec succès.
                </div>
              )}
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => rechargeMut.mutate()}
                disabled={rechargeMut.isPending || !montantRecharge || parseInt(montantRecharge, 10) < 100}
                className="w-full bg-tikexo-primary text-white text-sm font-medium py-3 rounded-xl disabled:opacity-50 hover:bg-tikexo-primary/90 transition-colors"
              >
                {rechargeMut.isPending ? 'Traitement en cours…' : `Créditer ${montantRecharge ? fmt(parseInt(montantRecharge, 10)) : '—'}`}
              </button>
              <button onClick={() => { setRechargeOpen(false); setMontantRecharge(''); }} className="w-full text-slate-500 text-sm py-2 hover:text-slate-700">Annuler</button>
            </div>
          </div>
        )}

        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Niveau</span>
              <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {niveauLabel[benef.niveau] ?? benef.niveau}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Statut compte</span>
              <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', statutClass)}>{statutTxt}</span>
            </div>
            {u.email_perso && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Email</span>
                <span className="text-[11px] text-slate-700">{u.email_perso}</span>
              </div>
            )}
          </div>

          <div className="bg-tikexo-primary rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/50 mb-1">Solde TIKEXO</div>
                <div className="text-xl font-semibold tracking-tight">{fmt(solde)}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Wallet size={16} className="text-white/70" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={13} className="text-slate-400" />
              <span className="text-[11px] text-slate-500 tracking-[0.5px]">HISTORIQUE DES DOTATIONS</span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : dotations.length === 0 ? (
              <div className="py-6 text-center">
                <CalendarDays size={20} className="text-slate-200 mx-auto mb-1.5" />
                <div className="text-xs text-slate-400">Aucune dotation</div>
              </div>
            ) : (
              <div className="space-y-2">
                {dotations.map((d) => {
                  const mois = new Date(d.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2.5">
                      <div>
                        <div className="text-xs font-medium text-slate-900 capitalize">{mois}</div>
                        <div className="text-[10px] text-slate-400">{d.nb_titres} titres · {fmtDate(d.distribue_at || d.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{fmt(d.part_employeur)}</span>
                        <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-medium', statutDotBadge[d.statut])}>
                          {statutDotLabel[d.statut]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
          <button
            onClick={() => setRechargeOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-tikexo-primary text-white text-xs font-medium py-2.5 rounded-lg hover:bg-tikexo-primary/90 transition-colors"
          >
            <Plus size={13} />
            Recharger le solde
          </button>
          <button
            onClick={() => setSortieOpen(true)}
            className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 text-xs font-medium py-2.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={13} />
            Sortie de l'entreprise
          </button>
        </div>
      </div>
    </div>
  );
}
