import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ShieldAlert, Check, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

const niveauStyle: Record<string, string> = {
  N4: 'bg-[#FCEBEB] text-[#A32D2D]',
  N3: 'bg-[#FAEEDA] text-[#854F0B]',
  N2: 'bg-[#EAF3DE] text-[#3B6D11]',
  N1: 'bg-[#DBEAFE] text-[#185FA5]',
};

export default function AdminAntiFraude() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alertes-fraude-full'],
    queryFn: () => api.get('/admin/alertes-fraude?limit=50').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const items: Array<{
    id: string; niveau: number; niveauLabel: string;
    description: string; regle: string; createdAt: string;
  }> = data?.items || [];
  const critiques = data?.critiques ?? 0;

  return (
    <div className="p-[18px_20px]">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[15px] font-medium text-slate-900">Anti-fraude</div>
        <button
          onClick={() => refetch()}
          className="text-[11px] text-tikexo-accent hover:underline"
        >
          Actualiser
        </button>
      </div>
      <div className="text-xs text-slate-500 mb-4">
        Alertes en temps réel · actualisation auto 30s
      </div>

      {critiques > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-[#FCEBEB] border border-[#F7C1C1] mb-4">
          <AlertTriangle size={15} className="text-[#A32D2D] flex-shrink-0 mt-px" />
          <div className="text-[11px] text-slate-900">
            <strong>{critiques} wallet{critiques > 1 ? 's' : ''} bloqué{critiques > 1 ? 's' : ''} définitivement</strong>{' '}
            — intervention manuelle requise.
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="flex items-center gap-1.5 px-3.5 py-3 border-b border-slate-100">
          <ShieldAlert size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-900">Alertes actives</span>
          {!isLoading && <span className="ml-auto text-[11px] text-slate-500">{items.length} alerte{items.length > 1 ? 's' : ''}</span>}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <Check size={28} className="text-tikexo-success" />
            <div className="text-sm text-slate-500">Aucune alerte active</div>
            <div className="text-xs text-slate-400">La plateforme est sécurisée</div>
          </div>
        ) : (
          items.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-100 last:border-0">
              <div className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0',
                niveauStyle[f.niveauLabel] ?? 'bg-slate-100 text-slate-700'
              )}>
                {f.niveauLabel}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-900 truncate">{f.description}</div>
                <div className="text-[10px] text-slate-500">{f.regle}</div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                {new Date(f.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0">
                Traiter
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
