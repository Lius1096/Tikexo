import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import api from '../../lib/api';

const PERIODES = [
  { label: '7 jours', value: '7j' },
  { label: '30 jours', value: '30j' },
  { label: '90 jours', value: '90j' },
];

export default function AdminStatistiques() {
  const [periode, setPeriode] = useState('30j');

  const { data: txStats, isLoading: txLoading } = useQuery({
    queryKey: ['admin-stats-tx', periode],
    queryFn: () =>
      api.get(`/admin/stats/transactions?periode=${periode}`).then((r) => r.data.data),
  });

  const { data: walletStats, isLoading: wLoading } = useQuery({
    queryKey: ['admin-stats-wallets'],
    queryFn: () => api.get('/admin/stats/wallets').then((r) => r.data.data),
  });

  const txData = (txStats || []).map((s: { statut: string; _count: number; _sum: { montant_total: string; commission_tikexo: string } }) => ({
    statut: s.statut,
    count: s._count,
    montant: Math.round(parseFloat(s._sum?.montant_total || '0') / 1000),
    commission: Math.round(parseFloat(s._sum?.commission_tikexo || '0') / 1000),
  }));

  const walletData = (walletStats || []).map((s: { type: string; _sum: { solde: string }; _count: number }) => ({
    type: s.type,
    solde: Math.round(parseFloat(s._sum?.solde || '0') / 1000),
    count: s._count,
  }));

  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Statistiques</div>
      <div className="text-xs text-slate-500 mb-4">Vue analytique de la plateforme TIKEXO</div>

      <div className="flex gap-2 mb-5">
        {PERIODES.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriode(p.value)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              periode === p.value
                ? 'bg-tikexo-primary text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-lg">
          <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
            <BarChart2 size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Transactions (K XOF)</span>
          </div>
          <div className="px-4 py-3">
            {txLoading ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
            ) : txData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={txData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="statut" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v} K XOF`]} />
                  <Bar dataKey="montant" fill="#1A3C5E" radius={[3, 3, 0, 0]} name="Montant" />
                  <Bar dataKey="commission" fill="#0EA5E9" radius={[3, 3, 0, 0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-lg">
          <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
            <BarChart2 size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Soldes wallets (K XOF)</span>
          </div>
          <div className="px-4 py-3">
            {wLoading ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
            ) : walletData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={walletData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v} K XOF`]} />
                  <Bar dataKey="solde" fill="#B45309" radius={[3, 3, 0, 0]} name="Solde total" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
