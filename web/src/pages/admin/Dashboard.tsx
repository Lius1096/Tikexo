import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, FileText, ShieldAlert, AlertTriangle,
  Check, RefreshCw, ShieldX, TrendingUp, Store,
} from 'lucide-react';
import api from '../../lib/api';
import { fmtCompact, fmtNum, fmtHeure } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalEntreprises: number;
  totalBeneficiaires: number;
  totalCommercants: number;
  totalTransactions: number;
  volumeJour: number;
  commissionsAccumulees: number;
}

interface Entreprise {
  id: string;
  nom: string;
  ville: string;
  statut: 'ACTIF' | 'EN_ATTENTE' | 'SUSPENDU';
  wallet?: { solde: string };
  _count?: { liensBeneficiaires: number };
}

interface AuditEntry {
  id: string;
  action: string;
  entite: string;
  createdAt: string;
  user?: { nom: string; prenom: string; role: string };
}

interface FraudeAlerte {
  id: string;
  niveau: number;
  niveauLabel: string;
  description: string;
  regle: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statutBadge: Record<string, string> = {
  ACTIF: 'bg-[#EAF3DE] text-[#3B6D11]',
  EN_ATTENTE: 'bg-[#FAEEDA] text-[#854F0B]',
  SUSPENDU: 'bg-[#FCEBEB] text-[#A32D2D]',
};
const statutLabel: Record<string, string> = {
  ACTIF: 'Actif',
  EN_ATTENTE: 'En attente',
  SUSPENDU: 'Suspendu',
};

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];

type AuditType = 'ok' | 'warn' | 'danger';

function classifyAction(action: string): AuditType {
  const a = action.toUpperCase();
  if (a.includes('BLOQUE') || a.includes('GELE') || a.includes('FRAUDE') || a.includes('ECHEC')) return 'danger';
  if (a.includes('MUTATION') || a.includes('TRANSFER') || a.includes('RECHARGE')) return 'warn';
  return 'ok';
}

function AuditIcon({ type }: { type: AuditType }) {
  const icons = { ok: Check, warn: RefreshCw, danger: ShieldX };
  const Icon = icons[type];
  return <Icon size={12} />;
}

const auditBg: Record<AuditType, string> = { ok: 'bg-[#EAF3DE]', warn: 'bg-[#FAEEDA]', danger: 'bg-[#FCEBEB]' };
const auditFg: Record<AuditType, string> = { ok: 'text-[#3B6D11]', warn: 'text-[#854F0B]', danger: 'text-[#A32D2D]' };

const niveauStyle: Record<string, string> = {
  N4: 'bg-[#FCEBEB] text-[#A32D2D]',
  N3: 'bg-[#FAEEDA] text-[#854F0B]',
  N2: 'bg-[#EAF3DE] text-[#3B6D11]',
  N1: 'bg-[#DBEAFE] text-[#185FA5]',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const now = new Date();
  const moisAnnee = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard').then((r) => r.data.data),
  });

  const { data: entreprisesData, isLoading: entreprisesLoading } = useQuery({
    queryKey: ['admin-entreprises-recent'],
    queryFn: () =>
      api.get<{ success: boolean; data: { items: Entreprise[] } }>('/entreprises?limit=4&page=1').then((r) => r.data.data),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit-recent'],
    queryFn: () =>
      api.get<{ success: boolean; data: { items: AuditEntry[] } }>('/admin/audit-logs?limit=4&page=1').then((r) => r.data.data),
  });

  const { data: fraudeData, isLoading: fraudeLoading } = useQuery({
    queryKey: ['admin-alertes-fraude'],
    queryFn: () =>
      api.get<{ success: boolean; data: { items: FraudeAlerte[]; critiques: number } }>('/admin/alertes-fraude?limit=5').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const stats = statsData;
  const entreprises = entreprisesData?.items ?? [];
  const auditLogs = auditData?.items ?? [];
  const fraudes = fraudeData?.items ?? [];
  const critiques = fraudeData?.critiques ?? 0;

  const kpis = stats
    ? [
        { label: 'Entreprises actives', value: fmtNum(stats.totalEntreprises), delta: 'actives ce mois' },
        { label: 'Bénéficiaires actifs', value: fmtNum(stats.totalBeneficiaires), delta: 'inscrits actifs' },
        { label: 'Volume transactions (jour)', value: fmtCompact(stats.volumeJour), delta: 'aujourd\'hui' },
        { label: 'Revenus TIKEXO', value: fmtCompact(stats.commissionsAccumulees), delta: 'commissions accum.', green: true },
      ]
    : [];

  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Vue globale</div>
      <div className="text-xs text-slate-500 mb-4">
        Plateforme TIKEXO · {moisAnnee} · tikexo.bj
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-[18px]">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-md px-3.5 py-3">
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-6 w-20 mb-1.5" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))
          : kpis.map((k) => (
              <div key={k.label} className="bg-white border border-slate-100 rounded-md px-3.5 py-3">
                <div className="text-[10px] text-slate-500 mb-1.5 tracking-[0.3px]">{k.label}</div>
                <div className={clsx('font-mono font-medium text-sm leading-none', k.green ? 'text-tikexo-success' : 'text-slate-900')}>
                  {k.value}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-tikexo-success">
                  <TrendingUp size={11} />
                  {k.delta}
                </div>
              </div>
            ))}
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
        {/* Entreprises */}
        <div className="bg-white border border-slate-100 rounded-lg">
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              Entreprises récentes
            </span>
            <Link to="/admin/entreprises" className="text-[11px] text-tikexo-accent cursor-pointer">
              Tout voir
            </Link>
          </div>
          <div className="px-3.5">
            {entreprisesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))
              : entreprises.map((e, idx) => {
                  const [bg, fg] = PALETTE[idx % PALETTE.length];
                  const initials = e.nom.slice(0, 2).toUpperCase();
                  const vol = e.wallet?.solde ? fmtCompact(parseFloat(e.wallet.solde)) : '—';
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                        style={{ background: bg, color: fg }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">{e.nom}</div>
                        <div className="text-[10px] text-slate-500">{e.ville}</div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-900 flex-shrink-0">{vol}</div>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-lg font-medium flex-shrink-0', statutBadge[e.statut] ?? statutBadge.EN_ATTENTE)}>
                        {statutLabel[e.statut] ?? e.statut}
                      </span>
                    </div>
                  );
                })}
            {!entreprisesLoading && entreprises.length === 0 && (
              <div className="py-4 text-center text-[11px] text-slate-400">Aucune entreprise</div>
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white border border-slate-100 rounded-lg">
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              Journal d'audit
            </span>
            <Link to="/admin/audit" className="text-[11px] text-tikexo-accent cursor-pointer">
              Tout voir
            </Link>
          </div>
          <div className="px-3.5">
            {auditLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <Skeleton className="w-6 h-6 rounded-md flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-36 mb-1" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                ))
              : auditLogs.map((log) => {
                  const type = classifyAction(log.action);
                  const who = log.user
                    ? `${log.user.prenom} ${log.user.nom} · ${log.user.role}`
                    : log.entite;
                  return (
                    <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <div className={clsx('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', auditBg[type])}>
                        <span className={auditFg[type]}>
                          <AuditIcon type={type} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-slate-900 truncate">
                          {log.action.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-px truncate">{who}</div>
                      </div>
                      <div className="text-[10px] text-slate-500 flex-shrink-0 font-mono">{fmtHeure(log.createdAt)}</div>
                    </div>
                  );
                })}
            {!auditLoading && auditLogs.length === 0 && (
              <div className="py-4 text-center text-[11px] text-slate-400">Aucun événement</div>
            )}
          </div>
        </div>
      </div>

      {/* Fraud Alerts */}
      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100">
          <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-slate-400" />
            Alertes anti-fraude en cours
          </span>
          <Link to="/admin/antifraude" className="text-[11px] text-tikexo-accent cursor-pointer">
            Gérer tout
          </Link>
        </div>

        {critiques > 0 && (
          <div className="flex items-start gap-2 mx-3.5 my-2.5 p-2.5 rounded-md bg-[#FCEBEB] border border-[#F7C1C1]">
            <AlertTriangle size={15} className="text-[#A32D2D] flex-shrink-0 mt-px" />
            <div className="text-[11px] text-slate-900 leading-relaxed">
              <strong>{critiques} wallet{critiques > 1 ? 's' : ''} bloqué{critiques > 1 ? 's' : ''} définitivement</strong>{' '}
              en attente de traitement manuel. Intervention requise.
            </div>
          </div>
        )}

        {fraudeLoading ? (
          <div className="px-3.5 py-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <Skeleton className="h-2.5 w-10" />
              </div>
            ))}
          </div>
        ) : fraudes.length === 0 ? (
          <div className="py-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Check size={14} className="text-tikexo-success" />
            Aucune alerte active — plateforme sécurisée
          </div>
        ) : (
          fraudes.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 px-3.5 py-2 border-b border-slate-100 last:border-0">
              <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0', niveauStyle[f.niveauLabel] ?? niveauStyle.N2)}>
                {f.niveauLabel}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-900 truncate">{f.description}</div>
                <div className="text-[10px] text-slate-500">{f.regle}</div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex-shrink-0">{fmtHeure(f.createdAt)}</div>
              <button className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer flex-shrink-0 hover:bg-slate-100 transition-colors">
                Traiter
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
