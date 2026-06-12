import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, BarChart2, CalendarDays, Users, Download, Plus,
  AlertTriangle, Info, TrendingUp, Minus,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

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
  part_employeur: string;
  part_salarie: string;
  mois_concerne: string;
  nb_titres: number;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtXOF = (n: number | string) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)))} XOF`;

const fmtKXOF = (n: number | string) => {
  const v = Number(n);
  return v >= 1000 ? `${(v / 1000).toFixed(0)} K` : `${v}`;
};

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

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('bg-slate-100 animate-pulse rounded', className)} />;
}

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
        `/dotations?entrepriseId=${entrepriseId}&limit=50`
      ).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const { data: beneficiairesData, isLoading: benefLoading } = useQuery({
    queryKey: ['employeur-beneficiaires', entrepriseId],
    queryFn: () =>
      api.get<{ success: boolean; data: BenefLien[] }>(`/entreprises/${entrepriseId}/beneficiaires`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const solde = walletData ? Number(walletData.solde) : 0;
  const soldeReserve = walletData ? Number(walletData.solde_reserve) : 0;
  const soldeDisponible = solde - soldeReserve;
  const pctDisponible = solde > 0 ? Math.round((soldeDisponible / solde) * 100) : 0;
  const pctReserve = 100 - pctDisponible;

  const dotations = dotationsData?.items ?? [];
  const dotationsRecentes = dotations.slice(0, 4);
  const beneficiaires = beneficiairesData ?? [];
  const beneficiairesRecents = beneficiaires.slice(0, 4);

  const totalActifs = beneficiaires.filter((b) => b.user.statut === 'ACTIF').length;
  const totalBenef = beneficiaires.length;
  const nonActives = beneficiaires.filter((b) => !b.user.wallet || Number(b.user.wallet.solde) === 0).length;
  const tauxActivation = totalBenef > 0 ? Math.round((totalActifs / totalBenef) * 100) : 0;

  const dotationsMoisActuel = dotations.filter(
    (d) => d.statut === 'DISTRIBUE' || d.statut === 'VALIDE'
  );
  const totalDote = dotationsMoisActuel.reduce((sum, d) => sum + Number(d.part_employeur), 0);

  const totalDepenses = dotations
    .filter((d) => d.statut === 'DISTRIBUE')
    .reduce((sum, d) => sum + Number(d.montant_total), 0);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { emp: number; sal: number }> = {};
    for (const d of dotations) {
      const m = new Date(d.mois_concerne);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { emp: 0, sal: 0 };
      byMonth[key].emp += Number(d.part_employeur) / 1000;
      byMonth[key].sal += Number(d.part_salarie) / 1000;
    }
    const sorted = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
    return sorted.map(([key, vals]) => {
      const [, monthIdx] = key.split('-');
      return { month: MOIS_FR[parseInt(monthIdx, 10)], emp: Math.round(vals.emp), sal: Math.round(vals.sal) };
    });
  }, [dotations]);

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
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Tableau de bord</div>
          <div className="text-xs text-slate-500 mt-0.5">{entrepriseNom} — {moisAnnee}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
            <Download size={15} />
            Exporter
          </button>
          <Link
            to="/employeur/wallet"
            className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] bg-tikexo-primary text-white border border-tikexo-primary cursor-pointer hover:bg-tikexo-accent hover:border-tikexo-accent transition-colors"
          >
            <Plus size={15} />
            Recharger wallet
          </Link>
        </div>
      </div>

      <div className="p-6">
        {/* Flow Strip */}
        <div className="bg-white border border-slate-100 rounded-lg px-5 py-4 mb-5 flex items-center">
          {walletLoading ? (
            <Skeleton className="h-12 flex-1" />
          ) : (
            <>
              <FlowNode label="VOTRE WALLET" value={fmtKXOF(solde)} sub="XOF disponibles" />
              <FlowArrow label="0 frais" free />
              <FlowNode label="DOTATIONS VALIDÉES" value={fmtKXOF(totalDote)} sub={`${totalActifs} salariés actifs`} accent />
              <FlowArrow label="0 frais" free />
              <FlowNode label="DÉPENSES SALARIÉS" value={fmtKXOF(totalDepenses)} sub={`ce mois en cours`} accent />
              <FlowArrow label="payout 72h" />
              <FlowNode label="COMMISSION TIKEXO" value="—" sub="2% sur transactions" earned />
            </>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {benefLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-md" />)
          ) : (
            <>
              <MetricCard label="Salariés actifs" value={String(totalActifs)} delta={`${totalBenef} au total`} trend="up" />
              <MetricCard label="Taux d'activation" value={`${tauxActivation}%`} delta={`${totalActifs} / ${totalBenef} actifs`} trend="up" green />
              <MetricCard
                label="Solde disponible"
                value={fmtKXOF(soldeDisponible)}
                delta="XOF disponibles"
                trend={pctDisponible > 50 ? 'up' : 'flat'}
                warn={pctDisponible <= 50}
              />
              <MetricCard label="Non activés" value={String(nonActives)} delta="cartes sans solde" trend={nonActives > 0 ? 'down' : 'up'} red={nonActives > 0} />
            </>
          )}
        </div>

        {/* Wallet + Chart */}
        <div className="grid grid-cols-2 gap-4 mb-5">
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
                  <div className="font-mono text-[28px] font-medium text-slate-900 mb-1">{fmtXOF(solde)}</div>
                  <div className="text-xs text-slate-500 mb-3.5 flex items-center gap-1">
                    Dont{' '}
                    <span className="text-tikexo-gold ml-1">{fmtXOF(soldeReserve)} réservés</span>
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
                      <div className="font-mono text-xs text-slate-900 mt-1">{fmtXOF(soldeDisponible)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1.5">Réservé</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-tikexo-gold rounded-full" style={{ width: `${pctReserve}%` }} />
                      </div>
                      <div className="font-mono text-xs text-slate-900 mt-1">{fmtXOF(soldeReserve)}</div>
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
                    <Bar dataKey="emp" fill="#1A3C5E" radius={[3, 3, 0, 0]} name="Part employeur" />
                    <Bar dataKey="sal" fill="#0EA5E9" radius={[3, 3, 0, 0]} name="Part salarié" />
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
                  Part employeur
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-2 h-2 rounded-[2px] bg-tikexo-accent flex-shrink-0" />
                  Part salarié
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dotations + Bénéficiaires */}
        <div className="grid grid-cols-2 gap-4 mb-5">
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
                          {niveauLabel[d.lien.niveau] ?? d.lien.niveau} · {d.nb_titres} jours
                        </div>
                      </div>
                      <div className="font-mono text-[13px] text-slate-900 flex-shrink-0">{fmtXOF(d.part_employeur)}</div>
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
              <table className="w-full border-collapse">
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
                          <td className="font-mono text-xs text-slate-900 px-4 py-2.5">{fmtXOF(soldeB)}</td>
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
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#DBEAFE] border border-[#B5D4F4]">
          <Info size={16} className="text-[#185FA5] flex-shrink-0 mt-px" />
          <div className="text-xs text-slate-900 leading-relaxed">
            <strong>Dotations mois prochain.</strong> Vérifiez les présences et absences avant de lancer le calcul automatique des dotations.
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
