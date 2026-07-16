import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, BarChart2, CalendarDays, Users, Download, Plus,
  AlertTriangle, Info, TrendingUp, Minus, Trophy,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt, fmtK } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalletData {
  id: string;
  solde: string;
  solde_reserve: string;
  currency: string;
  statut: string;
}

interface DotationItem {
  id: string;
  statut: 'CALCULE' | 'VALIDE' | 'DISTRIBUE';
  montant_total: string;
  mois_concerne: string;
  lien: {
    niveau: string;
    user: { nom: string; prenom: string };
  };
}

interface BenefLien {
  id: string;
  niveau: string;
  statut: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    statut: string;
    wallet?: { solde: string; currency: string };
  };
}

interface StatsData {
  beneficiaires: { total: number; actifs: number; enAttente: number };
  consommationYTD: number;
  parMois: Array<{ mois: number; total: number }>;
  topConsommateurs: Array<{ user: { id: string; nom: string; prenom: string }; total: number; nb_transactions: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const statutDotBadge: Record<string, string> = {
  CALCULE: 'bg-[#FAEEDA] text-[#854F0B]',
  VALIDE: 'bg-[#EAF3DE] text-[#3B6D11]',
  DISTRIBUE: 'bg-[#DBEAFE] text-[#185FA5]',
};
const statutDotLabel: Record<string, string> = {
  CALCULE: 'À valider',
  VALIDE: 'Validé',
  DISTRIBUE: 'Distribué',
};

const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé',
  CADRE: 'Cadre',
  MANAGER: 'Manager',
  DIRECTEUR: 'Directeur',
};

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeurDashboard() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const entrepriseNom = user?.entrepriseNom ?? '—';

  const moisAnnee = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisCourt = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['employeur-wallet', entrepriseId],
    queryFn: () =>
      api.get<{ success: boolean; data: WalletData }>(`/entreprises/${entrepriseId}/wallet`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const { data: dotationsData, isLoading: dotationsLoading } = useQuery({
    queryKey: ['employeur-dotations', entrepriseId],
    queryFn: () =>
      api.get<{ success: boolean; data: { items: DotationItem[] } }>(
        `/dotations?entrepriseId=${entrepriseId}&limit=5`
      ).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const { data: beneficiairesData, isLoading: benefLoading } = useQuery({
    queryKey: ['beneficiaires-entreprise', entrepriseId],
    queryFn: () =>
      api.get<{ success: boolean; data: BenefLien[] }>(`/entreprises/${entrepriseId}/beneficiaires`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['employeur-stats', entrepriseId],
    queryFn: () =>
      api.get<{ success: boolean; data: StatsData }>(`/entreprises/${entrepriseId}/stats`).then((r) => r.data.data),
    enabled: !!entrepriseId,
    staleTime: 60_000,
  });

  const solde = walletData ? Number(walletData.solde) : 0;
  const soldeReserve = walletData ? Number(walletData.solde_reserve) : 0;
  const soldeDisponible = solde - soldeReserve;
  const pctDisponible = solde > 0 ? Math.round((soldeDisponible / solde) * 100) : 0;
  const pctReserve = 100 - pctDisponible;

  const dotationsRecentes = dotationsData?.items?.slice(0, 4) ?? [];
  const beneficiaires = beneficiairesData ?? [];
  const beneficiairesRecents = beneficiaires.slice(0, 4);

  const totalActifs = statsData?.beneficiaires.actifs ?? beneficiaires.filter((b) => b.user.statut === 'ACTIF').length;
  const totalBenef = statsData?.beneficiaires.total ?? beneficiaires.length;
  const enAttente = statsData?.beneficiaires.enAttente ?? 0;
  const tauxActivation = totalBenef > 0 ? Math.round((totalActifs / totalBenef) * 100) : 0;
  const consommationYTD = statsData?.consommationYTD ?? 0;
  const topConsommateurs = statsData?.topConsommateurs ?? [];

  // Graphique — année civile courante uniquement (Jan → mois actuel)
  const moisCourant = new Date().getMonth();
  const chartData = (statsData?.parMois ?? [])
    .slice(0, moisCourant + 1)
    .map((m) => ({
      month: MOIS_FR[m.mois],
      total: Math.round(m.total / 1000),
    }));

  // Pour la flow strip : dotations distribuées ce mois (issus de dotationsRecentes)
  const totalDote = dotationsRecentes
    .filter((d) => d.statut === 'VALIDE' || d.statut === 'DISTRIBUE')
    .reduce((s, d) => s + Number(d.montant_total), 0);
  const totalDepenses = dotationsRecentes
    .filter((d) => d.statut === 'DISTRIBUE')
    .reduce((s, d) => s + Number(d.montant_total), 0);

  if (!entrepriseId) {
    return (
      <div className="min-h-full bg-slate-100 flex items-center justify-center">
        <div className="bg-white border border-slate-100 rounded-xl p-6 text-center max-w-sm">
          <div className="text-sm font-medium text-slate-900 mb-1">Profil incomplet</div>
          <div className="text-xs text-slate-500">
            Votre compte n'est pas encore rattaché à une entreprise. Contactez un administrateur TIKEXO.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-100">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-slate-100">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Tableau de bord</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px] sm:max-w-none">{entrepriseNom} — {moisAnnee}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
            <Download size={15} />
            Exporter
          </button>
          <Link
            to="/employeur/wallet"
            className="flex items-center gap-1.5 px-3 md:px-3.5 py-[7px] rounded-md text-[13px] bg-tikexo-primary text-white border border-tikexo-primary cursor-pointer hover:bg-tikexo-accent hover:border-tikexo-accent transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Recharger wallet</span>
            <span className="sm:hidden">Recharger</span>
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Flow Strip — scrollable horizontalement sur mobile */}
        <div className="bg-white border border-slate-100 rounded-lg px-5 py-4 mb-5 overflow-x-auto no-scrollbar">
        <div className="flex items-center min-w-[480px]">
          {walletLoading ? (
            <Skeleton className="h-12 flex-1" />
          ) : (
            <>
              <FlowNode label="VOTRE WALLET" value={fmtK(solde)} sub="XOF disponibles" />
              <FlowArrow label="0 frais" free />
              <FlowNode label="DOTATIONS VALIDÉES" value={fmtK(totalDote)} sub={`${totalActifs} salariés actifs`} accent />
              <FlowArrow label="0 frais" free />
              <FlowNode label="DÉPENSES SALARIÉS" value={fmtK(totalDepenses)} sub={`ce mois en cours`} accent />
              <FlowArrow label="payout 72h" />
              <FlowNode label="REVENUS TIKEXO" value="—" sub="10% sur transactions" earned />
            </>
          )}
        </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {(benefLoading || statsLoading) ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-md" />)
          ) : (
            <>
              <MetricCard label="Salariés actifs" value={String(totalActifs)} delta={`${totalBenef} au total · ${enAttente} en attente`} trend="up" />
              <MetricCard label="Taux d'activation" value={`${tauxActivation}%`} delta={`${totalActifs} / ${totalBenef} actifs`} trend="up" green />
              <MetricCard
                label="Solde disponible"
                value={fmtK(soldeDisponible)}
                delta="XOF disponibles"
                trend={pctDisponible > 50 ? 'up' : 'flat'}
                warn={pctDisponible <= 50}
              />
              <MetricCard
                label={`Consommation ${new Date().getFullYear()}`}
                value={fmtK(consommationYTD)}
                delta="XOF year-to-date"
                trend={consommationYTD > 0 ? 'up' : 'flat'}
              />
            </>
          )}
        </div>

        {/* Wallet + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Wallet */}
          <div className="bg-white border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                <Wallet size={14} className="text-slate-400" />
                Wallet entreprise
              </span>
              <Link to="/employeur/wallet" className="text-xs text-tikexo-accent cursor-pointer">
                Historique
              </Link>
            </div>
            <div className="px-4 py-3">
              {walletLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-36" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="font-mono text-[28px] font-medium text-slate-900 mb-1">{fmt(solde)}</div>
                  <div className="text-xs text-slate-500 mb-3.5 flex items-center gap-1">
                    Dont{' '}
                    <span className="text-tikexo-gold ml-1">{fmt(soldeReserve)} réservés</span>
                    <span className="ml-1">(dotations validées)</span>
                  </div>
                  {pctDisponible <= 50 && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-[#FAEEDA] border border-[#FAC775] mb-2.5">
                      <AlertTriangle size={16} className="text-[#854F0B] flex-shrink-0 mt-px" />
                      <div className="text-xs text-slate-900 leading-relaxed">
                        <strong>Solde en baisse.</strong> Rechargez avant la fin du mois pour garantir les prochaines dotations.
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1.5">Disponible</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-tikexo-accent rounded-full" style={{ width: `${pctDisponible}%` }} />
                      </div>
                      <div className="font-mono text-xs text-slate-900 mt-1">{fmt(soldeDisponible)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1.5">Réservé</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-tikexo-gold rounded-full" style={{ width: `${pctReserve}%` }} />
                      </div>
                      <div className="font-mono text-xs text-slate-900 mt-1">{fmt(soldeReserve)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                <BarChart2 size={14} className="text-slate-400" />
                Dotations mensuelles
              </span>
              <Link to="/employeur/dotations" className="text-xs text-tikexo-accent cursor-pointer">
                Voir tout
              </Link>
            </div>
            <div className="px-4 py-3">
              {dotationsLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chartData} barSize={8} barGap={2}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: '0.5px solid #e2e8f0' }}
                      formatter={(v: number) => [`${v} K XOF`]}
                    />
                    <Bar dataKey="total" fill="#1A3C5E" radius={[3, 3, 0, 0]} name="Allocations" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[11px] text-slate-400">
                  Aucune dotation historique
                </div>
              )}
              <div className="flex gap-3.5 mt-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-2 h-2 rounded-[2px] bg-tikexo-primary flex-shrink-0" />
                  Allocations distribuées
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dotations + Bénéficiaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Dotations */}
          <div className="bg-white border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-slate-400" />
                Dotations {moisCourt}
              </span>
              <Link to="/employeur/dotations" className="text-xs text-tikexo-accent cursor-pointer">
                Valider tout
              </Link>
            </div>
            <div className="px-3 py-2">
              {dotationsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
                    <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))
              ) : dotationsRecentes.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-slate-400">Aucune dotation ce mois</div>
              ) : (
                dotationsRecentes.map((d, idx) => {
                  const [bg, fg] = PALETTE[idx % PALETTE.length];
                  const initials = `${d.lien.user.prenom[0] ?? ''}${d.lien.user.nom[0] ?? ''}`.toUpperCase();
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                        style={{ background: bg, color: fg }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {d.lien.user.prenom} {d.lien.user.nom}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {niveauLabel[d.lien.niveau] ?? d.lien.niveau}
                        </div>
                      </div>
                      <div className="font-mono text-[13px] text-slate-900 flex-shrink-0">{fmt(d.montant_total)}</div>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium flex-shrink-0', statutDotBadge[d.statut] ?? 'bg-slate-100 text-slate-700')}>
                        {statutDotLabel[d.statut] ?? d.statut}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bénéficiaires */}
          <div className="bg-white border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                <Users size={14} className="text-slate-400" />
                Bénéficiaires
              </span>
              <Link to="/employeur/beneficiaires" className="text-xs text-tikexo-accent cursor-pointer">
                Tous les salariés
              </Link>
            </div>
            {benefLoading ? (
              <div className="px-4 py-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[420px]">
                <thead>
                  <tr>
                    {['NOM', 'NIVEAU', 'SOLDE', 'STATUT'].map((h) => (
                      <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-1.5 border-b border-slate-100 font-normal tracking-[0.5px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {beneficiairesRecents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-[11px] text-slate-400">
                        Aucun bénéficiaire
                      </td>
                    </tr>
                  ) : (
                    beneficiairesRecents.map((b, idx) => {
                      const [bg, fg] = PALETTE[idx % PALETTE.length];
                      const initials = `${b.user.prenom[0] ?? ''}${b.user.nom[0] ?? ''}`.toUpperCase();
                      const soldeB = b.user.wallet ? Number(b.user.wallet.solde) : 0;
                      const statutLabel2 =
                        b.user.statut === 'ACTIF' ? 'Actif' : b.user.statut === 'INACTIF' ? 'En attente' : b.user.statut;
                      const statutClass =
                        b.user.statut === 'ACTIF'
                          ? 'bg-[#EAF3DE] text-[#3B6D11]'
                          : b.user.statut === 'BLOQUE'
                          ? 'bg-[#FCEBEB] text-[#A32D2D]'
                          : 'bg-[#FAEEDA] text-[#854F0B]';
                      return (
                        <tr key={b.id} className="border-b border-slate-100 last:border-0">
                          <td className="text-xs text-slate-900 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                                style={{ background: bg, color: fg }}
                              >
                                {initials}
                              </div>
                              {b.user.prenom} {b.user.nom}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-[10px]">
                              {niveauLabel[b.niveau] ?? b.niveau}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-slate-900 px-4 py-2.5">{fmt(soldeB)}</td>
                          <td className="px-4 py-2.5">
                            <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutClass)}>
                              {statutLabel2}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        {/* Top consommateurs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-white border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                <Trophy size={14} className="text-tikexo-gold" />
                Top consommateurs {new Date().getFullYear()}
              </span>
              <Link to="/employeur/rapports" className="text-xs text-tikexo-accent cursor-pointer">Rapports</Link>
            </div>
            <div className="px-3 py-2">
              {statsLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
              ) : topConsommateurs.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-slate-400">Aucune transaction cette année</div>
              ) : (
                topConsommateurs.map((t, idx) => {
                  const [bg, fg] = PALETTE[idx % PALETTE.length];
                  const initials = `${t.user.prenom[0] ?? ''}${t.user.nom[0] ?? ''}`.toUpperCase();
                  return (
                    <div key={t.user.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
                      <div className="text-[11px] font-mono text-slate-400 w-4 text-center flex-shrink-0">{idx + 1}</div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0" style={{ background: bg, color: fg }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">{t.user.prenom} {t.user.nom}</div>
                        <div className="text-[10px] text-slate-400">{t.nb_transactions} transaction{t.nb_transactions > 1 ? 's' : ''}</div>
                      </div>
                      <div className="font-mono text-[13px] text-slate-900 flex-shrink-0">{fmt(t.total)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#DBEAFE] border border-[#B5D4F4] flex-1">
              <Info size={16} className="text-[#185FA5] flex-shrink-0 mt-px" />
              <div className="text-xs text-slate-900 leading-relaxed">
                <strong>Dotations mois prochain.</strong> Vérifiez les présences et absences avant de lancer le calcul automatique des dotations.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlowNode({
  label, value, sub, accent, earned,
}: {
  label: string; value: string; sub: string; accent?: boolean; earned?: boolean;
}) {
  return (
    <div className="text-center flex-1">
      <div className="text-[10px] text-slate-500 tracking-[0.8px] mb-1">{label}</div>
      <div className={clsx(
        'font-mono text-[18px] font-medium leading-none',
        accent ? 'text-tikexo-accent' : earned ? 'text-tikexo-success' : 'text-slate-900'
      )}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

function FlowArrow({ label, free }: { label: string; free?: boolean }) {
  return (
    <div className="flex flex-col items-center px-2 flex-shrink-0">
      <div className="relative w-10 h-px bg-slate-200">
        <div className="absolute -right-1 -top-[3px] w-0 h-0 border-l-[5px] border-l-slate-300 border-y-[3px] border-y-transparent" />
      </div>
      <div className={clsx('text-[10px] mt-1 font-mono', free ? 'text-tikexo-success font-medium' : 'text-slate-500')}>
        {label}
      </div>
    </div>
  );
}

function MetricCard({
  label, value, delta, trend, green, warn, red,
}: {
  label: string; value: string; delta: string;
  trend: 'up' | 'down' | 'flat';
  green?: boolean; warn?: boolean; red?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-md px-4 py-3.5">
      <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">{label}</div>
      <div className={clsx(
        'font-mono text-[20px] font-medium leading-none',
        green ? 'text-tikexo-success' : warn ? 'text-tikexo-gold' : red ? 'text-tikexo-danger' : 'text-slate-900'
      )}>
        {value}
      </div>
      <div className={clsx(
        'flex items-center gap-1 mt-1 text-[11px]',
        trend === 'up' ? 'text-tikexo-success' : trend === 'down' ? 'text-tikexo-danger' : 'text-slate-500'
      )}>
        {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
        ) : <Minus size={12} />}
        {delta}
      </div>
    </div>
  );
}
