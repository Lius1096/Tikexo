import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, Info } from 'lucide-react';
import api from '../../lib/api';

interface Config {
  taux_frais_benef:      number;
  taux_frais_commercant: number;
  plafond_journalier:    number;
  seuil_payout_minimum:  number;
  seuil_anti_fraude:     number;
}

const CHAMPS: { key: keyof Config; label: string; unite: string; desc: string; min: number; max: number; step: number }[] = [
  { key: 'taux_frais_benef',      label: 'Frais bénéficiaire',     unite: '%',   desc: 'Prélevé sur chaque transaction côté bénéficiaire',     min: 0, max: 20,     step: 0.5  },
  { key: 'taux_frais_commercant', label: 'Frais commerçant',       unite: '%',   desc: 'Déduit du montant reçu par le commerçant',             min: 0, max: 20,     step: 0.5  },
  { key: 'plafond_journalier',    label: 'Plafond journalier',     unite: 'XOF', desc: 'Montant max qu\'un bénéficiaire peut dépenser par jour', min: 1000, max: 100000, step: 500  },
  { key: 'seuil_payout_minimum',  label: 'Seuil payout minimum',  unite: 'XOF', desc: 'Solde minimum d\'un commerçant pour déclencher un payout', min: 500, max: 50000,  step: 100  },
  { key: 'seuil_anti_fraude',     label: 'Seuil anti-fraude',     unite: '/5',  desc: 'Score de risque à partir duquel une transaction est bloquée', min: 1, max: 5,  step: 1    },
];

export default function AdminConfiguration() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Config>({
    queryKey: ['admin-config'],
    queryFn: () => api.get('/admin/configuration').then((r) => r.data.data),
  });

  const [form, setForm] = useState<Partial<Config>>({});
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => api.put('/admin/configuration', form).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      setSucces(true);
      setErreur(null);
      setTimeout(() => setSucces(false), 3000);
    },
    onError: (err: any) => {
      setErreur(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.');
    },
  });

  function afficher(key: keyof Config, val: number) {
    if (key === 'taux_frais_benef' || key === 'taux_frais_commercant') return (val * 100).toFixed(1);
    return val;
  }

  function parseSaisie(key: keyof Config, raw: string): number {
    const n = parseFloat(raw);
    if (key === 'taux_frais_benef' || key === 'taux_frais_commercant') return n / 100;
    return n;
  }

  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Configuration</div>
      <div className="text-xs text-slate-500 mb-4">Paramètres globaux de la plateforme TIKEXO</div>

      {succes && (
        <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Configuration enregistrée avec succès.
        </div>
      )}
      {erreur && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</div>
      )}

      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
          <Settings size={14} className="text-slate-400" />
          <span className="text-[13px] font-medium text-slate-900">Paramètres plateforme</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {CHAMPS.map(({ key, label, unite, desc, min, max, step }) => {
              const val = form[key] ?? 0;
              const affichage = afficher(key, val as number);
              return (
                <div key={key} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-800">{label}</div>
                    <div className="flex items-start gap-1 mt-0.5">
                      <Info size={10} className="text-slate-300 mt-0.5 flex-shrink-0" />
                      <div className="text-[11px] text-slate-400 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={affichage}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: parseSaisie(key, e.target.value) }))
                      }
                      className="w-28 text-xs text-right border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-tikexo-primary"
                    />
                    <span className="text-[11px] text-slate-400 w-8">{unite}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isLoading}
            className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Enregistrer la configuration
          </button>
          <div className="text-[11px] text-slate-400">
            Les modifications prennent effet immédiatement pour toutes les nouvelles transactions.
          </div>
        </div>
      </div>
    </div>
  );
}
