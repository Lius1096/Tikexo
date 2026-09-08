import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, MapPin, Tag } from 'lucide-react';
import api from '../../lib/api';
import { fmtDateHeure } from '../../utils/format';

type AuditEntry = {
  id: string; action: string; entite: string; entite_id: string;
  user?: { nom: string; prenom: string; role: string };
  ip: string; createdAt: string;
};

const LIMIT = 5;

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get('/admin/audit-logs', { params: { page, limit: LIMIT } }).then((r) => r.data.data),
  });

  const items: AuditEntry[] = data?.items || [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-tikexo-dark mb-1">Journal d'audit TIKEXO</h2>
      <p className="text-xs sm:text-sm text-gray-500 mb-6">
        Ce journal est immuable — aucune entrée ne peut être modifiée ou supprimée. {total} entrée{total > 1 ? 's' : ''} au total.
      </p>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-slate-400">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400 bg-white border border-slate-100 rounded-lg">Aucune entrée</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((entry) => (
              <div key={entry.id} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-tikexo-primary break-words">{entry.action}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">{fmtDateHeure(entry.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
                  <Tag size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{entry.entite} · {entry.entite_id ?? '—'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
                  <User size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {entry.user ? `${entry.user.prenom} ${entry.user.nom} (${entry.user.role})` : 'Système'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin size={11} className="flex-shrink-0" />
                  <span className="truncate">{entry.ip || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 px-1">
              <span className="text-[11px] text-slate-400">Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
