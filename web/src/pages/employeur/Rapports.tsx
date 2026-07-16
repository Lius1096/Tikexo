import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, Download } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeurRapports() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;

  const { data: dotations, isLoading } = useQuery({
    queryKey: ['rapports-dotations', entrepriseId],
    queryFn: () =>
      api.get(`/dotations?entrepriseId=${entrepriseId}&limit=100`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const chartData = React.useMemo(() => {
    if (!dotations?.items) return [];
    const byMonth: Record<string, { total: number }> = {};
    for (const d of dotations.items) {
      const m = new Date(d.mois_concerne);
      const key = `${m.getFullYear()}-${String(m.getMonth()).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { total: 0 };
      byMonth[key].total += Number(d.montant_total);
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        month: MOIS_FR[parseInt(key.split('-')[1], 10)],
        total: Math.round(v.total / 1000),
      }));
  }, [dotations]);

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-medium text-slate-900">Statistiques</div>
        <div className="flex items-center gap-2">
          <a
            href={`${api.defaults.baseURL}/dotations/export/csv?entreprise_id=${entrepriseId}`}
            download
            className="flex items-center gap-1.5 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download size={12} /> Dotations CSV
          </a>
          <a
            href={`${api.defaults.baseURL}/transactions/export/csv`}
            download
            className="flex items-center gap-1.5 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download size={12} /> Transactions CSV
          </a>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
          <BarChart2 size={14} className="text-slate-400" />
          <span className="text-[13px] font-medium text-slate-900">Dotations des 6 derniers mois (en K XOF)</span>
        </div>
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">Chargement…</div>
          ) : chartData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
              Aucune donnée disponible
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={10} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: '0.5px solid #e2e8f0' }}
                    formatter={(v: number) => [`${v} K XOF`]}
                  />
                  <Bar dataKey="total" fill="#1A3C5E" radius={[3, 3, 0, 0]} name="Dotations distribuées" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-2 h-2 rounded-[2px] bg-tikexo-primary" />Allocations distribuées
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
