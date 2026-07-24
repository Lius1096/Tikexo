import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Users, X, CalendarDays, Plus, Phone, AlertCircle, LogOut,
  RefreshCw, PauseCircle, PlayCircle, Upload, Download, Search,
  SlidersHorizontal, LayoutGrid, List, ChevronDown, Zap, MoreHorizontal,
  CheckCircle2, Clock, XCircle, Lock, Unlock, Copy, Send,
  ArrowUpRight, ShoppingBag, Pencil, Save, History,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt, fmtDate } from '../../utils/format';
import { CarteVirtuelle, type CarteData } from '../../components/CarteVisuelle';
import ImportCsvBeneficiaires from '../../components/ImportCsvBeneficiaires';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Carte {
  id: string; type: string; statut: string; numero_masque: string;
  date_expiration?: string; nfc_active?: boolean;
}
interface DerniereDotation {
  montant_total: string;
  mois_concerne: string; statut: string; createdAt: string;
}
interface BenefItem {
  id: string;
  niveau: string;
  statut: string;
  allocation_mensuelle: string;
  user: {
    id: string; nom: string; prenom: string;
    telephone: string; email_perso?: string; statut: string;
    wallet?: { solde: string; currency: string };
    carte: Carte | null;
    derniereActivite: string | null;
  };
  derniereDotation: DerniereDotation | null;
}

interface AjoutForm {
  prenom: string; nom: string; telephone: string;
  email_pro: string; niveau: string;
  allocation_mensuelle: string;
}

interface HistoriqueEntry {
  id: string;
  action: string;
  libelle: string;
  createdAt: string;
  effectuePar: { nom: string; prenom: string; role: string; matricule: string | null } | null;
}


const FORM_VIDE: AjoutForm = {
  prenom: '', nom: '', telephone: '', email_pro: '',
  niveau: 'EMPLOYE', allocation_mensuelle: '5000',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NIVEAUX = [
  { value: 'EMPLOYE', label: 'Employé' },
  { value: 'CADRE', label: 'Cadre' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTEUR', label: 'Directeur' },
];
const ALLOCATION_PAR_NIVEAU: Record<string, number> = {
  EMPLOYE: 5000, CADRE: 8000, MANAGER: 10000, DIRECTEUR: 15000,
};
const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé', CADRE: 'Cadre', MANAGER: 'Manager', DIRECTEUR: 'Directeur',
};
const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
  ['#F3E8FF', '#7C3AED'], ['#CCFBF1', '#0F766E'],
];

function tempsDepuis(date: string | null): string {
  if (!date) return '—';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'À l\'instant';
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`;
  if (s < 2592000) return `Il y a ${Math.floor(s / 86400)} j`;
  return fmtDate(date);
}

function statut(b: BenefItem): 'actif' | 'attente' | 'inactif' {
  if (b.statut === 'TERMINE') return 'inactif';
  if (b.user.statut === 'BLOQUE') return 'inactif';
  if (b.user.statut === 'ACTIF') return 'actif';
  return 'attente';
}

function statutLabel(b: BenefItem): string {
  if (b.statut === 'TERMINE') return 'Sorti';
  if (b.user.statut === 'BLOQUE') return 'Suspendu';
  if (b.user.statut === 'ACTIF') return 'Actif';
  return 'En attente';
}

// ─── Page principale ───────────────────────────────────────────────────────────

type TabKey = 'tous' | 'actifs' | 'attente' | 'inactifs';

export default function EmployeurBeneficiaires() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const entrepriseId = user?.entrepriseId;
  const qc = useQueryClient();

  const [tab, setTab]           = useState<TabKey>('tous');
  const [search, setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState<AjoutForm>(FORM_VIDE);
  const [erreur, setErreur]     = useState<string | null>(null);
  const [utilisateurExistant, setUtilisateurExistant] = useState<{ id: string; nom: string; prenom: string } | null>(null);
  const checkTelRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Filtres + Vue
  const [filtresOpen, setFiltresOpen]     = useState(false);
  const [vueMode, setVueMode]             = useState<'table' | 'grid'>('table');
  const [filtreCarte, setFiltreCarte]     = useState<'' | 'avec' | 'sans' | 'bloquee'>('');
  const [filtreDotation, setFiltreDotation] = useState<'' | 'avec' | 'sans'>('');
  const [triPar, setTriPar]               = useState<'' | 'nom' | 'dotation' | 'activite'>('');
  const filtresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtresOpen) return;
    function handle(e: MouseEvent) {
      if (filtresRef.current && !filtresRef.current.contains(e.target as Node))
        setFiltresOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [filtresOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaires-entreprise', entrepriseId],
    queryFn: () =>
      api.get(`/entreprises/${entrepriseId}/beneficiaires`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const items: BenefItem[] = data || [];

  // Counts
  const total      = items.length;
  const nbActifs   = items.filter((b) => statut(b) === 'actif').length;
  const nbAttente  = items.filter((b) => statut(b) === 'attente').length;
  const nbInactifs = items.filter((b) => statut(b) === 'inactif').length;
  const pctActifs  = total > 0 ? Math.round((nbActifs / total) * 100) : 0;

  // Filtrage
  const filtresActifs = [filtreCarte, filtreDotation, triPar].filter(Boolean).length;

  const filtered = items
    .filter((b) => {
      const matchTab =
        tab === 'tous' || statut(b) === (tab === 'actifs' ? 'actif' : tab === 'attente' ? 'attente' : 'inactif');
      const q = search.toLowerCase();
      const matchSearch = !q ||
        b.user.nom.toLowerCase().includes(q) ||
        b.user.prenom.toLowerCase().includes(q) ||
        b.user.telephone.includes(q) ||
        (b.user.email_perso?.toLowerCase() ?? '').includes(q);
      const matchCarte =
        filtreCarte === ''       ? true :
        filtreCarte === 'avec'   ? !!b.user.carte :
        filtreCarte === 'sans'   ? !b.user.carte :
        b.user.carte?.statut === 'BLOQUEE';
      const matchDotation =
        filtreDotation === ''     ? true :
        filtreDotation === 'avec' ? !!b.derniereDotation :
        !b.derniereDotation;
      return matchTab && matchSearch && matchCarte && matchDotation;
    })
    .sort((a, z) => {
      if (triPar === 'nom')      return `${a.user.prenom} ${a.user.nom}`.localeCompare(`${z.user.prenom} ${z.user.nom}`);
      if (triPar === 'dotation') return Number(z.derniereDotation?.montant_total || 0) - Number(a.derniereDotation?.montant_total || 0);
      if (triPar === 'activite') return new Date(z.user.derniereActivite || 0).getTime() - new Date(a.user.derniereActivite || 0).getTime();
      return 0;
    });

  const selected = items.find((b) => b.id === selectedId) ?? null;

  // Ajout mutation
  const ajoutMutation = useMutation({
    mutationFn: async (f: AjoutForm) => {
      const { data: creerRes } = await api.post('/beneficiaires', {
        prenom: f.prenom.trim(), nom: f.nom.trim(),
        telephone: f.telephone.replace(/\D/g, ''),
        email_pro: f.email_pro.trim() || undefined,
      });
      const userId = creerRes.data.id;
      await api.post(`/beneficiaires/${userId}/rattacher`, {
        entrepriseId, niveau: f.niveau,
        allocationMensuelle: parseFloat(f.allocation_mensuelle) || 5000,
      });
      return userId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      setModalOpen(false); setForm(FORM_VIDE); setErreur(null);
    },
    onError: (err: any) => {
      const raw: string = err?.response?.data?.error || err?.response?.data?.message || '';
      const status: number = err?.response?.status;
      let msg = 'Une erreur inattendue est survenue.';
      if (status === 409 || raw.toLowerCase().includes('déjà actif'))
        msg = 'Ce salarié est déjà actif dans votre entreprise.';
      else if (raw.toLowerCase().includes('rôle') || raw.toLowerCase().includes('role'))
        msg = 'Ce numéro appartient à un compte non-salarié.';
      else if (status === 403) msg = "Droits insuffisants.";
      else if (raw) msg = raw;
      setErreur(msg);
    },
  });

  const telValide = /^\d{10}$/.test(form.telephone.replace(/\D/g, ''));
  // Email obligatoire pour un nouveau bénéficiaire — c'est le canal d'invitation.
  // Pas requis en ré-embauche (le compte existe déjà).
  const formValide = telValide && !!(utilisateurExistant || (form.prenom.trim() && form.nom.trim() && form.email_pro.trim()));

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
            if (found && !items.some((b) => b.user.id === found.id)) {
              setUtilisateurExistant({ id: found.id, nom: found.nom, prenom: found.prenom });
              setForm((f) => ({ ...f, nom: found.nom, prenom: found.prenom }));
            }
          } catch { /* nouveau salarié */ }
        }, 500);
      }
    }
  }

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] flex flex-col">
      {/* Barre de recherche globale */}
      <div className="px-6 pt-4 pb-3 bg-white border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un bénéficiaire, une transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 transition-colors placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-4 bg-white border-b border-slate-100">
        <div className="text-[11px] text-slate-400 mb-1">{user?.entrepriseNom ?? 'Employeur'} / Bénéficiaires</div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Bénéficiaires</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Gérez les comptes salariés, leurs cartes et leurs dotations.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/employeur/beneficiaires/import')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={13} />Import CSV
            </button>
            <a
              href={`${api.defaults.baseURL}/dotations/export/csv?entreprise_id=${entrepriseId}`}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Upload size={13} />Exporter
            </a>
            <button
              onClick={() => { setForm(FORM_VIDE); setErreur(null); setUtilisateurExistant(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-[12px] font-medium hover:bg-[#4338CA] transition-colors"
            >
              <Plus size={13} />Nouveau bénéficiaire
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 sm:px-6 py-4">
        <StatCard icon={<Users size={18} className="text-[#6366F1]" />} bg="bg-[#EEF2FF]"
          label="TOTAL" value={String(total)} sub="bénéficiaires enregistrés" />
        <StatCard icon={<CheckCircle2 size={18} className="text-[#10B981]" />} bg="bg-[#ECFDF5]"
          label="ACTIFS" value={`${nbActifs}`} valueSub={`(${pctActifs}%)`} sub="carte activée + utilisée" />
        <StatCard icon={<Clock size={18} className="text-[#F59E0B]" />} bg="bg-[#FFFBEB]"
          label="EN ATTENTE" value={String(nbAttente)} sub="non activés > 30 jours" />
        <StatCard icon={<XCircle size={18} className="text-[#EF4444]" />} bg="bg-[#FEF2F2]"
          label="INACTIFS" value={String(nbInactifs)} sub="sortis / suspendus" />
      </div>

      {/* Body — table + panel */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 px-4 sm:px-6 pb-6 min-h-0">
        {/* Table container */}
        <div className={clsx('flex flex-col bg-white rounded-xl border border-slate-100 overflow-hidden transition-all min-w-0', selected ? 'lg:flex-[3]' : 'flex-1')}>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
            {([
              ['tous',     `Tous ${total}`],
              ['actifs',   `Actifs ${nbActifs}`],
              ['attente',  `En attente ${nbAttente}`],
              ['inactifs', `Inactifs ${nbInactifs}`],
            ] as [TabKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  'px-3 py-2 text-[12px] font-medium rounded-t border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0',
                  tab === key
                    ? 'border-[#4F46E5] text-[#4F46E5]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <span className="text-[11px] text-slate-400 flex-1">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              {filtresActifs > 0 && <span className="ml-1 text-[#4F46E5]">· {filtresActifs} filtre{filtresActifs > 1 ? 's' : ''} actif{filtresActifs > 1 ? 's' : ''}</span>}
            </span>

            {/* Filtres dropdown */}
            <div className="relative" ref={filtresRef}>
              <button
                onClick={() => setFiltresOpen((v) => !v)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-lg transition-colors',
                  filtresOpen || filtresActifs > 0
                    ? 'border-[#4F46E5] text-[#4F46E5] bg-[#EEF2FF]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <SlidersHorizontal size={13} />
                Filtres
                {filtresActifs > 0 && (
                  <span className="ml-0.5 bg-[#4F46E5] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {filtresActifs}
                  </span>
                )}
              </button>

              {filtresOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 space-y-4">
                  {/* Statut carte */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 tracking-[0.5px] mb-2">STATUT CARTE</div>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ['', 'Tous'],
                        ['avec', 'Avec carte'],
                        ['sans', 'Sans carte'],
                        ['bloquee', 'Bloquée'],
                      ] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setFiltreCarte(val)}
                          className={clsx('text-[11px] px-2.5 py-1 rounded-lg border transition-colors',
                            filtreCarte === val
                              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 hover:border-[#4F46E5]')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dotation */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 tracking-[0.5px] mb-2">DOTATION</div>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ['', 'Tous'],
                        ['avec', 'Avec dotation'],
                        ['sans', 'Sans dotation'],
                      ] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setFiltreDotation(val)}
                          className={clsx('text-[11px] px-2.5 py-1 rounded-lg border transition-colors',
                            filtreDotation === val
                              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 hover:border-[#4F46E5]')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tri */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 tracking-[0.5px] mb-2">TRIER PAR</div>
                    <div className="flex flex-col gap-0.5">
                      {([
                        ['', 'Par défaut'],
                        ['nom', 'Nom A → Z'],
                        ['dotation', 'Dotation décroissante'],
                        ['activite', 'Dernière activité'],
                      ] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setTriPar(val)}
                          className={clsx('text-left text-[11px] px-2.5 py-1.5 rounded-lg transition-colors',
                            triPar === val
                              ? 'bg-[#EEF2FF] text-[#4F46E5] font-medium'
                              : 'text-slate-600 hover:bg-slate-50')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filtresActifs > 0 && (
                    <button
                      onClick={() => { setFiltreCarte(''); setFiltreDotation(''); setTriPar(''); }}
                      className="w-full text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Vue toggle */}
            <button
              onClick={() => setVueMode((v) => v === 'table' ? 'grid' : 'table')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-lg transition-colors',
                vueMode === 'grid'
                  ? 'border-[#4F46E5] text-[#4F46E5] bg-[#EEF2FF]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {vueMode === 'table' ? <LayoutGrid size={13} /> : <List size={13} />}
              {vueMode === 'table' ? 'Grille' : 'Tableau'}
            </button>
          </div>

          {/* Table / Grille */}
          <div className="overflow-auto flex-1">
            {vueMode === 'grid' ? (
              /* ── Vue grille ── */
              isLoading ? (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 p-4 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-200 mb-3" />
                      <div className="h-3 bg-slate-200 rounded w-2/3 mb-1.5" />
                      <div className="h-2 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Users size={28} className="text-slate-200 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">Aucun bénéficiaire{search && ' trouvé'}</div>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map((b, idx) => (
                    <BenefCard
                      key={b.id}
                      benef={b}
                      isSelected={b.id === selectedId}
                      onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                      palette={PALETTE[idx % PALETTE.length]}
                    />
                  ))}
                </div>
              )
            ) : (
              /* ── Vue tableau ── */
              <table className="w-full border-collapse min-w-[560px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="w-8 px-4 py-2.5"><input type="checkbox" className="rounded border-slate-300" /></th>
                    {['BÉNÉFICIAIRE', 'NIVEAU', 'STATUT CARTE', 'SOLDE', 'DOTATION / DERNIÈRE ACTIVITÉ'].map((h) => (
                      <th key={h} className="text-[10px] text-slate-400 text-left px-3 py-2.5 font-normal tracking-[0.5px] border-b border-slate-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-3"><div className="w-4 h-4 bg-slate-100 animate-pulse rounded" /></td>
                        {[80, 60, 60, 55, 100].map((w, j) => (
                          <td key={j} className="px-3 py-3">
                            <div className="h-3 bg-slate-100 animate-pulse rounded" style={{ width: w }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Users size={28} className="text-slate-200 mx-auto mb-2" />
                        <div className="text-sm text-slate-400">Aucun bénéficiaire{search && ' trouvé'}</div>
                        {!search && (
                          <button
                            onClick={() => { setForm(FORM_VIDE); setErreur(null); setUtilisateurExistant(null); setModalOpen(true); }}
                            className="mt-3 flex items-center gap-1.5 bg-[#4F46E5] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#4338CA] mx-auto"
                          >
                            <Plus size={13} />Ajouter le premier salarié
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b, idx) => {
                      const [bg, fg] = PALETTE[idx % PALETTE.length];
                      const initials = `${b.user.prenom[0] ?? ''}${b.user.nom[0] ?? ''}`.toUpperCase();
                      const solde = Number(b.user.wallet?.solde || 0);
                      const st = statut(b);
                      const isSelected = b.id === selectedId;

                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                          className={clsx(
                            'border-b border-slate-50 last:border-0 cursor-pointer transition-colors',
                            isSelected ? 'bg-[#EEF2FF]/40' : 'hover:bg-slate-50/60'
                          )}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-slate-300" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                                  style={{ background: bg, color: fg }}>
                                  {initials}
                                </div>
                                <div className={clsx(
                                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                                  st === 'actif' ? 'bg-green-400' : st === 'attente' ? 'bg-amber-400' : 'bg-slate-300'
                                )} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-medium text-slate-900 truncate flex items-center gap-1.5">
                                  {b.user.prenom} {b.user.nom}
                                  {b.statut === 'TERMINE' && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">SORTI</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  {b.user.email_perso || b.user.telephone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <NiveauBadge niveau={b.niveau} />
                          </td>
                          <td className="px-3 py-3">
                            {b.user.carte ? (
                              <span className={clsx(
                                'inline-flex items-center gap-1 text-[11px] font-medium',
                                b.user.carte.statut === 'ACTIVE' ? 'text-[#10B981]' : 'text-[#EF4444]'
                              )}>
                                <span className={clsx('w-1.5 h-1.5 rounded-full', b.user.carte.statut === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-[#EF4444]')} />
                                {b.user.carte.statut === 'ACTIVE' ? 'Active' : 'Bloquée'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-300 italic">Non émise</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-[12px] text-slate-900 font-medium">
                            {fmt(solde)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[12px] text-slate-900 font-medium">
                              {b.derniereDotation ? `${fmt(Number(b.derniereDotation.montant_total))} FCFA` : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tempsDepuis(b.user.derniereActivite)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel détail */}
        {selected && (
          <BenefPanel
            benef={selected}
            entrepriseId={entrepriseId}
            onClose={() => setSelectedId(null)}
            onRefresh={() => qc.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] })}
          />
        )}
      </div>

      {/* Modal ajout */}
      {modalOpen && (
        <AjoutModal
          entrepriseId={entrepriseId}
          form={form}
          patchForm={patchForm}
          utilisateurExistant={utilisateurExistant}
          erreur={erreur}
          formValide={formValide}
          telValide={telValide}
          isPending={ajoutMutation.isPending}
          onSubmit={() => ajoutMutation.mutate(form)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon, bg, label, value, valueSub, sub }: {
  icon: React.ReactNode; bg: string;
  label: string; value: string; valueSub?: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3.5">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-0.5">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-bold text-slate-900 leading-none">{value}</span>
          {valueSub && <span className="text-[12px] font-medium text-slate-500">{valueSub}</span>}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

// ─── NiveauBadge ──────────────────────────────────────────────────────────────

const NIVEAU_COLORS: Record<string, string> = {
  EMPLOYE:   'bg-[#DBEAFE] text-[#1D4ED8]',
  CADRE:     'bg-[#EDE9FE] text-[#6D28D9]',
  MANAGER:   'bg-[#D1FAE5] text-[#065F46]',
  DIRECTEUR: 'bg-[#FEE2E2] text-[#991B1B]',
};

function NiveauBadge({ niveau }: { niveau: string }) {
  return (
    <span className={clsx('inline-block text-[10px] font-medium px-2 py-0.5 rounded-full', NIVEAU_COLORS[niveau] ?? 'bg-slate-100 text-slate-600')}>
      {niveauLabel[niveau] ?? niveau}
    </span>
  );
}

// ─── BenefCard (vue grille) ───────────────────────────────────────────────────

function BenefCard({ benef, isSelected, onClick, palette }: {
  benef: BenefItem; isSelected: boolean; onClick: () => void; palette: string[];
}) {
  const [bg, fg] = palette;
  const initials = `${benef.user.prenom[0] ?? ''}${benef.user.nom[0] ?? ''}`.toUpperCase();
  const st = statut(benef);
  const solde = Number(benef.user.wallet?.solde || 0);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm',
        isSelected ? 'border-[#4F46E5] bg-[#EEF2FF]/20' : 'border-slate-100 hover:border-slate-200'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold"
            style={{ background: bg, color: fg }}
          >
            {initials}
          </div>
          <div className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            st === 'actif' ? 'bg-green-400' : st === 'attente' ? 'bg-amber-400' : 'bg-slate-300'
          )} />
        </div>
        <NiveauBadge niveau={benef.niveau} />
      </div>
      <div className="text-[13px] font-semibold text-slate-900 truncate">
        {benef.user.prenom} {benef.user.nom}
      </div>
      <div className="text-[10px] text-slate-400 truncate mb-3">
        {benef.user.email_perso || benef.user.telephone}
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="font-mono text-[12px] font-semibold text-slate-800">
          {fmt(solde)} <span className="text-[10px] text-slate-400 font-sans font-normal">XOF</span>
        </div>
        {benef.user.carte ? (
          <span className={clsx(
            'inline-flex items-center gap-1 text-[10px] font-medium',
            benef.user.carte.statut === 'ACTIVE' ? 'text-green-600' : 'text-red-500'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', benef.user.carte.statut === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400')} />
            {benef.user.carte.statut === 'ACTIVE' ? 'Active' : 'Bloquée'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 italic">Sans carte</span>
        )}
      </div>
    </div>
  );
}

// ─── BenefPanel ───────────────────────────────────────────────────────────────

function BenefPanel({ benef, entrepriseId, onClose, onRefresh }: {
  benef: BenefItem;
  entrepriseId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const u = benef.user;
  const qc = useQueryClient();
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();
  const solde = Number(u.wallet?.solde || 0);
  const st = statut(benef);

  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [montantRecharge, setMontantRecharge]  = useState('');
  const [sortieOpen, setSortieOpen]     = useState(false);
  const [optionSolde, setOptionSolde]   = useState<'CONSERVATION' | 'REMBOURSEMENT'>('CONSERVATION');
  const [moreOpen, setMoreOpen]         = useState(false);
  const [exclureOpen, setExclureOpen]   = useState(false);
  const [confirmText, setConfirmText]   = useState('');
  const [copied, setCopied]             = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [editForm, setEditForm]         = useState({
    prenom: u.prenom, nom: u.nom, telephone: u.telephone,
    email_perso: u.email_perso ?? '',
    niveau: benef.niveau,
    allocation_mensuelle: benef.allocation_mensuelle ?? '',
  });
  const patchEdit = (p: Partial<typeof editForm>) => setEditForm((f) => ({ ...f, ...p }));

  // Queries
  const { data: statsData } = useQuery({
    queryKey: ['benef-stats', u.id],
    queryFn: () => api.get(`/transactions/benef-stats?beneficiaireId=${u.id}`).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data: txData } = useQuery({
    queryKey: ['benef-transactions', u.id],
    queryFn: () =>
      api.get(`/transactions?beneficiaireId=${u.id}&limit=4`).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const transactions: any[] = txData?.items || [];

  const { data: historiqueData } = useQuery({
    queryKey: ['benef-historique', u.id, entrepriseId],
    queryFn: () =>
      api.get(`/beneficiaires/${u.id}/historique?entrepriseId=${entrepriseId}`).then((r) => r.data.data),
    staleTime: 30_000,
  });
  const historique: HistoriqueEntry[] = historiqueData || [];

  // Mutations
  const rechargeMut = useMutation({
    mutationFn: () => api.post('/wallet/crediter-benef', {
      entrepriseId, beneficiaireId: u.id,
      montant: parseInt(montantRecharge.replace(/\D/g, ''), 10),
    }),
    onSuccess: () => { onRefresh(); setRechargeOpen(false); setMontantRecharge(''); },
  });

  const modifierMut = useMutation({
    mutationFn: () => api.put(`/beneficiaires/${u.id}`, {
      ...editForm,
      entrepriseId,
      allocationMensuelle: editForm.allocation_mensuelle,
    }),
    onSuccess: () => { onRefresh(); setEditOpen(false); },
  });

  const suspendreMut = useMutation({
    mutationFn: () => api.post(`/beneficiaires/${u.id}/suspendre`, { entrepriseId }),
    onSuccess: () => { onRefresh(); setMoreOpen(false); },
  });

  const reactiverMut = useMutation({
    mutationFn: () => api.post(`/beneficiaires/${u.id}/reactiver`, { entrepriseId }),
    onSuccess: () => { onRefresh(); setMoreOpen(false); },
  });

  const sortieMut = useMutation({
    mutationFn: () => api.post(`/beneficiaires/${u.id}/sortie`, { entrepriseId, optionSolde }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      setSortieOpen(false); onClose();
    },
  });

  const exclureMut = useMutation({
    mutationFn: () => api.post(`/beneficiaires/${u.id}/exclure`, { entrepriseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaires-entreprise', entrepriseId] });
      setExclureOpen(false); onClose();
    },
  });

  const bloquerMut = useMutation({
    mutationFn: () => api.post(`/cartes/${u.carte!.id}/bloquer`),
    onSuccess: () => { onRefresh(); qc.invalidateQueries({ queryKey: ['benef-stats', u.id] }); },
  });

  const debloquerMut = useMutation({
    mutationFn: () => api.post(`/cartes/${u.carte!.id}/debloquer`),
    onSuccess: () => { onRefresh(); },
  });

  const physiqueMut = useMutation({
    mutationFn: () => api.post(`/cartes/physique/demande/${u.id}`, { adresse_livraison: 'Cotonou' }),
    onSuccess: () => onRefresh(),
  });

  function copierNumero() {
    if (!u.carte) return;
    navigator.clipboard.writeText(u.carte.numero_masque).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Carte pour le composant CarteVirtuelle
  const carteData: CarteData | null = u.carte ? {
    id: u.carte.id,
    type: u.carte.type as 'VIRTUELLE' | 'PHYSIQUE',
    statut: u.carte.statut as any,
    numero_masque: u.carte.numero_masque,
    date_expiration: u.carte.date_expiration ?? new Date(Date.now() + 3 * 365 * 864e5).toISOString(),
    nfc_active: u.carte.nfc_active ?? true,
    user: { nom: u.nom, prenom: u.prenom },
  } : null;

  return (
    <div className="w-full lg:w-[320px] flex-shrink-0 bg-white rounded-xl border border-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="text-[11px] text-slate-400 tracking-[0.5px] font-medium">DÉTAIL BÉNÉFICIAIRE</div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100">
          <X size={12} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + identité */}
        <div className="px-4 pt-5 pb-4 text-center">
          <div className="relative inline-block mb-3">
            <div className="w-[60px] h-[60px] rounded-full bg-slate-200 flex items-center justify-center text-[18px] font-bold text-slate-500">
              {initials}
            </div>
            <div className={clsx(
              'absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
              st === 'actif' ? 'bg-green-400' : st === 'attente' ? 'bg-amber-400' : 'bg-slate-300'
            )} />
          </div>
          <div className="text-[14px] font-semibold text-slate-900">{u.prenom} {u.nom}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{niveauLabel[benef.niveau] ?? benef.niveau}</div>
          {u.email_perso && <div className="text-[10px] text-slate-400 mt-0.5">{u.email_perso}</div>}

          {/* Tags */}
          <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
            <span className={clsx(
              'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
              st === 'actif' ? 'bg-[#ECFDF5] text-[#065F46]'
              : st === 'attente' ? 'bg-[#FFFBEB] text-[#92400E]'
              : 'bg-[#FEF2F2] text-[#991B1B]'
            )}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', st === 'actif' ? 'bg-[#10B981]' : st === 'attente' ? 'bg-amber-400' : 'bg-slate-400')} />
              {statutLabel(benef)}
            </span>
            {u.carte && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                Carte {u.carte.type === 'VIRTUELLE' ? 'virtuelle' : 'physique'}
              </span>
            )}
          </div>
        </div>

        {/* Boutons principaux */}
        {!rechargeOpen ? (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => setRechargeOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#4F46E5] text-white text-[12px] font-semibold py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors"
            >
              <Zap size={13} />Recharger
            </button>
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className="flex items-center gap-1 px-3 py-2.5 text-[12px] border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <MoreHorizontal size={14} />Plus d'actions
                <ChevronDown size={11} />
              </button>
              {moreOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-52 bg-white border border-slate-100 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  <button onClick={() => { setMoreOpen(false); setEditOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50">
                    <Pencil size={13} />Modifier le profil
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {st === 'inactif' ? (
                    <button onClick={() => reactiverMut.mutate()} disabled={reactiverMut.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-green-700 hover:bg-green-50">
                      <PlayCircle size={13} />Réactiver le compte
                    </button>
                  ) : (
                    <button onClick={() => suspendreMut.mutate()} disabled={suspendreMut.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-amber-700 hover:bg-amber-50">
                      <PauseCircle size={13} />Suspendre le compte
                    </button>
                  )}
                  {benef.statut !== 'TERMINE' && benef.statut !== 'EXCLU' && (
                    <>
                      <div className="border-t border-slate-100 my-1" />
                      <button onClick={() => { setMoreOpen(false); setSortieOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50">
                        <LogOut size={13} />Sortie de l'entreprise
                      </button>
                    </>
                  )}
                  {benef.statut !== 'EXCLU' && (
                    <>
                      <div className="border-t border-slate-100 my-1" />
                      <button onClick={() => { setMoreOpen(false); setConfirmText(''); setExclureOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-red-800 hover:bg-red-100 font-medium">
                        <XCircle size={13} />Exclure définitivement
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-2">
            <div className="text-[11px] font-medium text-slate-700">Montant à créditer (XOF)</div>
            <input type="text" inputMode="numeric" value={montantRecharge}
              onChange={(e) => setMontantRecharge(e.target.value.replace(/\D/g, ''))}
              placeholder="ex : 5000" autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4F46E5]"
            />
            <div className="flex gap-2">
              {[2500, 5000, 10000].map((v) => (
                <button key={v} type="button" onClick={() => setMontantRecharge(String(v))}
                  className="flex-1 text-[11px] border border-slate-200 rounded-lg py-1.5 text-slate-600 hover:border-[#4F46E5]">
                  {fmt(v)}
                </button>
              ))}
            </div>
            {rechargeMut.isError && <div className="text-[10px] text-red-500">{(rechargeMut.error as any)?.response?.data?.message || 'Erreur'}</div>}
            <div className="flex gap-2">
              <button onClick={() => rechargeMut.mutate()}
                disabled={rechargeMut.isPending || !montantRecharge || parseInt(montantRecharge) < 100}
                className="flex-1 bg-[#4F46E5] text-white text-[12px] font-medium py-2 rounded-lg disabled:opacity-50">
                {rechargeMut.isPending ? 'Traitement…' : 'Confirmer'}
              </button>
              <button onClick={() => { setRechargeOpen(false); setMontantRecharge(''); }}
                className="px-3 text-[12px] text-slate-400 border border-slate-200 rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Formulaire d'édition du profil */}
        {editOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div className="text-[11px] font-semibold text-slate-700 tracking-[0.5px]">MODIFIER LE PROFIL</div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Prénom</label>
                <input value={editForm.prenom} onChange={e => patchEdit({ prenom: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#4F46E5]" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Nom</label>
                <input value={editForm.nom} onChange={e => patchEdit({ nom: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#4F46E5]" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Téléphone</label>
              <input value={editForm.telephone} onChange={e => patchEdit({ telephone: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#4F46E5]" />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Email</label>
              <input type="email" value={editForm.email_perso} onChange={e => patchEdit({ email_perso: e.target.value })}
                placeholder="email@exemple.com"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#4F46E5]" />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Niveau</label>
              <div className="grid grid-cols-4 gap-1">
                {(['EMPLOYE', 'CADRE', 'MANAGER', 'DIRECTEUR'] as const).map((n) => (
                  <button key={n} type="button"
                    onClick={() => patchEdit({ niveau: n, allocation_mensuelle: String(ALLOCATION_PAR_NIVEAU[n]) })}
                    className={clsx(
                      'text-[10px] py-1.5 rounded-lg border font-medium transition-colors',
                      editForm.niveau === n
                        ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                        : 'border-slate-200 text-slate-600 hover:border-[#4F46E5]'
                    )}>
                    {n === 'EMPLOYE' ? 'Employé' : n === 'CADRE' ? 'Cadre' : n === 'MANAGER' ? 'Mgr' : 'Dir'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Allocation mensuelle (XOF)</label>
              <input type="number" value={editForm.allocation_mensuelle}
                onChange={e => patchEdit({ allocation_mensuelle: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-mono focus:outline-none focus:border-[#4F46E5]" />
            </div>

            {modifierMut.isError && (
              <div className="text-[10px] text-red-500">{(modifierMut.error as any)?.response?.data?.message || 'Erreur'}</div>
            )}

            <div className="flex gap-2">
              <button onClick={() => modifierMut.mutate()} disabled={modifierMut.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#4F46E5] text-white text-[12px] font-medium py-2 rounded-lg disabled:opacity-50">
                <Save size={12} />{modifierMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditOpen(false)}
                className="px-3 text-[12px] text-slate-400 border border-slate-200 rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100" />

        {/* Carte TIKEXO PASS */}
        {carteData ? (
          <div className="px-4 py-4">
            <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-2.5">CARTE</div>

            {/* Carte visuelle — scale pour tenir dans 288px */}
            <div style={{ width: 288, height: Math.round(288 * (214 / 340)), overflow: 'hidden', borderRadius: 13, position: 'relative' }}>
              <div style={{ transform: `scale(${288 / 340})`, transformOrigin: 'top left', width: 340 }}>
                <CarteVirtuelle carte={carteData} scale={1} />
              </div>
            </div>

            {/* 3 actions carte */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {u.carte!.statut === 'ACTIVE' ? (
                <button onClick={() => bloquerMut.mutate()} disabled={bloquerMut.isPending}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-[10px]">
                  <Lock size={13} />Bloquer
                </button>
              ) : (
                <button onClick={() => debloquerMut.mutate()} disabled={debloquerMut.isPending}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors text-[10px]">
                  <Unlock size={13} />Débloquer
                </button>
              )}
              <button onClick={copierNumero}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-[10px]">
                <Copy size={13} className={copied ? 'text-green-500' : ''} />
                {copied ? 'Copié!' : 'Copier n°'}
              </button>
              <button onClick={() => physiqueMut.mutate()} disabled={physiqueMut.isPending || u.carte!.type === 'PHYSIQUE'}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-[10px] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={13} />Physique
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 text-center">
            <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-2">CARTE</div>
            <div className="bg-slate-50 rounded-xl py-6 text-[11px] text-slate-400">Aucune carte émise</div>
          </div>
        )}

        <div className="border-t border-slate-100" />

        {/* Stats */}
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-slate-400 mb-1">DOTATION / MOIS</div>
            <div className="font-semibold text-[14px] text-slate-900">
              {benef.derniereDotation ? `${fmt(Number(benef.derniereDotation.montant_total))} FCFA` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">CE MOIS</div>
            <div className="font-semibold text-[14px] text-slate-900">
              {statsData ? `${fmt(statsData.cesMois.total)} FCFA` : '—'}
            </div>
            {statsData && <div className="text-[10px] text-slate-400">{statsData.cesMois.nb} transaction{statsData.cesMois.nb !== 1 ? 's' : ''}</div>}
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">PANIER MOYEN</div>
            <div className="font-semibold text-[14px] text-slate-900">
              {statsData ? fmt(statsData.panierMoyen) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">RESTO FAVORI</div>
            <div className="font-semibold text-[13px] text-slate-900 leading-tight">
              {statsData?.restoFavori?.nom ?? '—'}
            </div>
            {statsData?.restoFavori && (
              <div className="text-[10px] text-slate-400">{statsData.restoFavori.nbVisites} visite{statsData.restoFavori.nbVisites !== 1 ? 's' : ''} / mois</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Dernières transactions */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[10px] text-slate-400 tracking-[0.5px]">DERNIÈRES TRANSACTIONS</div>
            <button className="flex items-center gap-0.5 text-[10px] text-[#4F46E5] hover:underline">
              Tout voir <ArrowUpRight size={10} />
            </button>
          </div>
          {transactions.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-slate-300 flex flex-col items-center gap-1.5">
              <ShoppingBag size={18} className="text-slate-200" />
              Aucune transaction
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-slate-900">{t.commercant?.nom ?? '—'}</div>
                    <div className="text-[10px] text-slate-400">{tempsDepuis(t.createdAt)}</div>
                  </div>
                  <div className="font-mono text-[12px] font-semibold text-red-500">
                    −{fmt(Number(t.montant_total))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* Historique — qui a fait quoi */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <History size={11} className="text-slate-400" />
            <div className="text-[10px] text-slate-400 tracking-[0.5px]">HISTORIQUE</div>
          </div>
          {historique.length === 0 ? (
            <div className="py-3 text-center text-[11px] text-slate-300">Aucun événement enregistré</div>
          ) : (
            <div className="space-y-2.5">
              {historique.map((h) => (
                <div key={h.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12px] text-slate-900">
                      <span className="font-medium">{h.libelle}</span>
                      {h.effectuePar && (
                        <span className="text-slate-500"> — par {h.effectuePar.prenom} {h.effectuePar.nom}{h.effectuePar.matricule ? ` (Mat. ${h.effectuePar.matricule})` : ''}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{tempsDepuis(h.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal sortie */}
      {sortieOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="text-[14px] font-semibold text-slate-900">Sortie de l'entreprise</div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[11px] text-amber-800">
              Action irréversible. Le lien entre <strong>{u.prenom} {u.nom}</strong> et votre entreprise sera clôturé.
            </div>
            <div className="space-y-2">
              {([
                { val: 'CONSERVATION', title: 'Conserver le solde', desc: `L'employé garde ses ${fmt(solde)} pendant 90 jours.` },
                { val: 'REMBOURSEMENT', title: 'Rembourser via Mobile Money', desc: `Les ${fmt(solde)} sont restitués. Solde à 0.` },
              ] as const).map(({ val, title, desc }) => (
                <button key={val} onClick={() => setOptionSolde(val)}
                  className={clsx('w-full text-left px-4 py-3 rounded-xl border-2 transition-colors',
                    optionSolde === val ? 'border-[#4F46E5] bg-[#EEF2FF]/50' : 'border-slate-200 hover:border-slate-300')}>
                  <div className="text-[12px] font-medium text-slate-900">{title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
            {sortieMut.isError && (
              <div className="text-[11px] text-red-500 text-center">
                {(sortieMut.error as any)?.response?.data?.message || 'Erreur'}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setSortieOpen(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-[12px] font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => sortieMut.mutate()} disabled={sortieMut.isPending}
                className="flex-1 bg-red-600 text-white text-[12px] font-medium py-2.5 rounded-xl disabled:opacity-50 hover:bg-red-700">
                {sortieMut.isPending ? 'Traitement…' : 'Confirmer la sortie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusion définitive */}
      {exclureOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle size={16} className="text-red-700" />
              </div>
              <div className="text-[14px] font-bold text-red-800">Exclusion définitive</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1.5">
              <div className="text-[12px] font-semibold text-red-800">Cette action est irréversible.</div>
              <div className="text-[11px] text-red-700">
                <strong>{u.prenom} {u.nom}</strong> ne pourra plus jamais être ré-embauché dans votre entreprise, ni réactivé via TIKEXO.
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1.5">
                Tapez <strong className="text-red-700 font-mono">EXCLURE</strong> pour confirmer
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="EXCLURE"
                className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-500"
              />
            </div>
            {exclureMut.isError && (
              <div className="text-[11px] text-red-500 text-center">
                {(exclureMut.error as any)?.response?.data?.error || 'Erreur'}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setExclureOpen(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-[12px] font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Annuler
              </button>
              <button
                onClick={() => exclureMut.mutate()}
                disabled={confirmText !== 'EXCLURE' || exclureMut.isPending}
                className="flex-1 bg-red-700 text-white text-[12px] font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-red-800">
                {exclureMut.isPending ? 'Traitement…' : 'Exclure définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AjoutModal ───────────────────────────────────────────────────────────────

function AjoutModal({ entrepriseId, form, patchForm, utilisateurExistant, erreur, formValide, telValide, isPending, onSubmit, onClose }: {
  entrepriseId: string;
  form: AjoutForm;
  patchForm: (p: Partial<AjoutForm>) => void;
  utilisateurExistant: { id: string; nom: string; prenom: string } | null;
  erreur: string | null;
  formValide: boolean;
  telValide: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'manuel' | 'import'>('manuel');

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
        <div>
          <div className="text-[15px] font-semibold text-slate-900">
            {mode === 'import' ? 'Importer des bénéficiaires' : utilisateurExistant ? 'Ré-embauche' : 'Nouveau bénéficiaire'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {mode === 'import'
              ? 'Ajout en masse depuis un fichier CSV'
              : utilisateurExistant ? 'Réactivation du lien entreprise' : 'Compte TIKEXO créé automatiquement'}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 flex-shrink-0">
        {([
          ['manuel', 'Saisie manuelle'],
          ['import', 'Import CSV'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={clsx(
              'px-3 py-2.5 text-[13px] font-medium rounded-t border-b-2 -mb-px transition-colors',
              mode === key
                ? 'border-[#4F46E5] text-[#4F46E5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {mode === 'import' ? (
          <ImportCsvBeneficiaires entrepriseId={entrepriseId} onFinish={onClose} />
        ) : (
        <div className="max-w-md mx-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Prénom <span className="text-red-400">*</span></label>
              <input type="text" value={form.prenom}
                onChange={(e) => patchForm({ prenom: e.target.value })}
                placeholder="ex : Kofi"
                disabled={!!utilisateurExistant}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Nom <span className="text-red-400">*</span></label>
              <input type="text" value={form.nom}
                onChange={(e) => patchForm({ nom: e.target.value })}
                placeholder="ex : Mensah"
                disabled={!!utilisateurExistant}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Téléphone Mobile Money <span className="text-red-400">*</span></label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="tel" inputMode="numeric" value={form.telephone}
                onChange={(e) => patchForm({ telephone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="ex : 0197000000" maxLength={10}
                className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>
            {form.telephone.length > 0 && !telValide && (
              <p className="text-[11px] text-red-500 mt-1">10 chiffres requis</p>
            )}
          </div>

          {utilisateurExistant && (
            <div className="flex items-start gap-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-3">
              <RefreshCw size={14} className="text-[#065F46] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#065F46]">
                <strong>{utilisateurExistant.prenom} {utilisateurExistant.nom}</strong> est déjà dans TIKEXO. Son compte sera réactivé.
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
              Email professionnel
              {!utilisateurExistant && <span className="text-red-400"> *</span>}
              <span className="text-slate-400 font-normal"> (reçoit le lien d'invitation)</span>
            </label>
            <input type="email" value={form.email_pro}
              onChange={(e) => patchForm({ email_pro: e.target.value })}
              placeholder="ex : kofi@entreprise.com"
              disabled={!!utilisateurExistant}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-2">Niveau</label>
            <div className="grid grid-cols-4 gap-2">
              {NIVEAUX.map((n) => (
                <button key={n.value} type="button" onClick={() => patchForm({ niveau: n.value, allocation_mensuelle: String(ALLOCATION_PAR_NIVEAU[n.value] ?? 5000) })}
                  className={clsx(
                    'text-[11px] font-medium py-2 rounded-lg border transition-colors',
                    form.niveau === n.value
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#4F46E5]'
                  )}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Allocation mensuelle (XOF)</label>
            <input type="number" inputMode="numeric" value={form.allocation_mensuelle}
              onChange={(e) => patchForm({ allocation_mensuelle: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              placeholder="ex : 5000"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Défaut pour ce niveau : <span className="font-medium text-slate-500">{(ALLOCATION_PAR_NIVEAU[form.niveau] ?? 5000).toLocaleString('fr-FR')} XOF/mois</span>. Modifiable librement.
            </p>
          </div>

          {erreur && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600">{erreur}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={!formValide || isPending}
            className="w-full bg-[#4F46E5] text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40 hover:bg-[#4338CA] transition-colors"
          >
            {isPending
              ? (utilisateurExistant ? 'Réactivation…' : 'Création…')
              : (utilisateurExistant ? 'Confirmer la ré-embauche' : 'Ajouter le salarié')}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
