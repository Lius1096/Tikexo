import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Users, Building2, ChevronDown, Search, Wallet } from 'lucide-react';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface EntrepriseRow {
  id: string;
  nom: string;
  ville: string;
  kyb_valide: boolean;
  statut: string;
  _count?: { liensBeneficiaires: number };
}

interface Beneficiaire {
  id: string;
  niveau: string;
  statut: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    statut: string;
    wallet?: { solde: string };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtXOF = (n: string | number) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)))} XOF`;

const NIVEAU_LABELS: Record<string, string> = {
  DIRECTEUR: 'Directeur', CADRE: 'Cadre', TECHNICIEN: 'Technicien', AGENT: 'Agent',
};

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
  ['#F3E8FF', '#7C3AED'], ['#FEF9C3', '#854D0E'],
];

// ── EnterpriseGroup ────────────────────────────────────────────────────────
function EnterpriseGroup({
  ent,
  search,
  paletteIdx,
}: {
  ent: EntrepriseRow;
  search: string;
  paletteIdx: number;
}) {
  const [open, setOpen] = useState(false);

  const { data: bens, isLoading } = useQuery<Beneficiaire[]>({
    queryKey: ['admin-bens-entreprise', ent.id],
    queryFn: () => api.get(`/entreprises/${ent.id}/beneficiaires`).then((r) => r.data.data),
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = (bens || []).filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${b.user.prenom} ${b.user.nom} ${b.user.telephone}`.toLowerCase().includes(q)
    );
  });

  const [bg, fg] = PALETTE[paletteIdx % PALETTE.length];
  const count = ent._count?.liensBeneficiaires ?? '?';

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden mb-2">
      {/* Enterprise header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
          style={{ background: bg, color: fg }}
        >
          {ent.nom.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-900 truncate">{ent.nom}</div>
          <div className="text-[10px] text-slate-400">{ent.ville}</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* KYB badge */}
          <span className={clsx(
            'text-[9px] px-2 py-0.5 rounded-full font-medium',
            ent.kyb_valide ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAEEDA] text-[#854F0B]'
          )}>
            {ent.kyb_valide ? 'KYB ✓' : 'KYB …'}
          </span>

          {/* Count badge */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-0.5">
            <Users size={10} className="text-slate-500" />
            <span className="text-[10px] font-medium text-slate-600">{count}</span>
          </div>

          <ChevronDown
            size={14}
            className={clsx('text-slate-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Expanded beneficiary table */}
      {open && (
        <div className="border-t border-slate-100">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Users size={20} className="text-slate-300 mx-auto mb-1.5" />
              <div className="text-xs text-slate-400">
                {bens?.length === 0 ? 'Aucun salarié rattaché' : 'Aucun résultat pour cette recherche'}
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {['SALARIÉ', 'TÉLÉPHONE', 'NIVEAU', 'SOLDE', 'STATUT'].map((h) => (
                    <th key={h} className="text-[10px] text-slate-400 text-left px-4 py-2 font-normal tracking-[0.5px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const [abg, afg] = PALETTE[i % PALETTE.length];
                  const initials = `${b.user.prenom?.[0] ?? ''}${b.user.nom?.[0] ?? ''}`.toUpperCase() || '?';
                  const statutCls = b.user.statut === 'ACTIF'
                    ? 'bg-[#EAF3DE] text-[#3B6D11]'
                    : b.user.statut === 'BLOQUE'
                    ? 'bg-[#FCEBEB] text-[#A32D2D]'
                    : 'bg-[#FAEEDA] text-[#854F0B]';

                  return (
                    <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                            style={{ background: abg, color: afg }}
                          >
                            {initials}
                          </div>
                          <span className="text-[11px] font-medium text-slate-800">
                            {b.user.prenom} {b.user.nom}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{b.user.telephone}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {NIVEAU_LABELS[b.niveau] || b.niveau}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800">
                          <Wallet size={11} className="text-slate-400" />
                          {fmtXOF(b.user.wallet?.solde || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('text-[9px] px-2 py-0.5 rounded-full font-medium', statutCls)}>
                          {b.user.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function AdminBeneficiaires() {
  const [search, setSearch] = useState('');
  const [openAll, setOpenAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-entreprises-bens'],
    queryFn: () => api.get('/entreprises?limit=200').then((r) => r.data.data),
  });

  const entreprises: EntrepriseRow[] = (data?.items || []).filter((e: EntrepriseRow) => {
    if (!search) return true;
    return e.nom.toLowerCase().includes(search.toLowerCase());
  });

  const totalBens = (data?.items || []).reduce(
    (acc: number, e: EntrepriseRow) => acc + (e._count?.liensBeneficiaires || 0), 0
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Bénéficiaires</div>
          <div className="text-xs text-slate-500">
            {data?.items?.length ?? '—'} entreprise{(data?.items?.length ?? 0) > 1 ? 's' : ''} · {totalBens} salarié{totalBens > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400"
            placeholder="Rechercher entreprise ou salarié…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400">Chargement…</div>
      ) : entreprises.length === 0 ? (
        <div className="py-16 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <div className="text-sm text-slate-400">Aucune entreprise trouvée</div>
        </div>
      ) : (
        <div>
          {entreprises.map((e, i) => (
            <EnterpriseGroup
              key={e.id}
              ent={e}
              search={search}
              paletteIdx={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
