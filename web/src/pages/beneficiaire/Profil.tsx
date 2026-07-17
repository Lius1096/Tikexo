import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Building2, Phone, Mail, Shield, Download, XCircle, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function BeneficiaireProfil() {
  const { user, logout } = useAuth();

  const { data: profil, isLoading } = useQuery({
    queryKey: ['beneficiaire-profil'],
    queryFn: () => api.get('/auth/profil').then((r) => r.data.data),
  });

  const lien = profil?.liensBeneficiaire?.[0];

  const [cloturerOpen, setCloturerOpen] = useState(false);
  const [confirmCloture, setConfirmCloture] = useState('');
  const [cloturerLoading, setCloturerLoading] = useState(false);
  const [cloturerErr, setCloturerErr] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await api.get('/auth/mes-donnees');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tikexo-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExportLoading(false);
    }
  }

  async function handleCloturer() {
    if (confirmCloture !== 'CLOTURER') return;
    setCloturerLoading(true);
    setCloturerErr('');
    try {
      await api.post('/auth/cloturer-compte');
      logout();
    } catch (err: any) {
      setCloturerErr(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setCloturerLoading(false);
    }
  }

  const rows = profil ? [
    { icon: User,  label: 'Nom complet',  value: `${profil.prenom} ${profil.nom}` },
    { icon: Phone, label: 'Téléphone',    value: profil.telephone },
    { icon: Mail,  label: 'Email perso',  value: profil.email_perso ?? '—' },
    { icon: Mail,  label: 'Email pro',    value: profil.email_pro ?? '—' },
    { icon: Shield,label: 'Statut',       value: profil.statut },
    { icon: Shield,label: 'KYC',          value: profil.kyc_niveau },
  ] : [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon profil</div>
        <div className="text-xs text-slate-500">Vos informations personnelles</div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Infos personnelles */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <span className="text-[13px] font-medium text-slate-900">Informations personnelles</span>
            </div>
            <div className="divide-y divide-slate-50">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">{label}</span>
                  <span className="text-xs text-slate-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Entreprise liée */}
          {lien && (
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                <span className="text-[13px] font-medium text-slate-900">Entreprise</span>
              </div>
              <div className="divide-y divide-slate-50">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Building2 size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Nom</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.entreprise?.nom}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Niveau</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.niveau}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={13} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Statut lien</span>
                  <span className="text-xs text-slate-800 font-medium">{lien.statut}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section RGPD */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Shield size={14} className="text-[#4F46E5]" />
              <span className="text-[13px] font-medium text-slate-900">Mes droits RGPD</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Info conservation */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-[11px] text-slate-500 leading-relaxed">
                Vos données personnelles sont conservées <strong>3 ans</strong> après clôture du compte. Vos transactions financières sont conservées <strong>5 ans</strong> conformément à la réglementation UEMOA.
              </div>

              {/* Télécharger mes données */}
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                  <Download size={14} className="text-[#4F46E5]" />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-slate-900">
                    {exportLoading ? 'Préparation…' : 'Télécharger mes données'}
                  </div>
                  <div className="text-[10px] text-slate-400">Fichier JSON — profil, wallet, transactions</div>
                </div>
              </button>

              {/* CGU */}
              <Link
                to="/cgu"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-slate-900">Conditions Générales d'Utilisation</div>
                  <div className="text-[10px] text-slate-400">CGU · Politique de confidentialité · RGPD</div>
                </div>
                <ExternalLink size={12} className="text-slate-300" />
              </Link>

              {/* Contact DPO */}
              <a
                href="mailto:rgpd@tikexo.bj"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-slate-500" />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-slate-900">Contacter le DPO</div>
                  <div className="text-[10px] text-slate-400">rgpd@tikexo.bj — rectification, opposition, suppression</div>
                </div>
              </a>

              {/* Clôturer le compte */}
              <button
                onClick={() => { setCloturerOpen(true); setConfirmCloture(''); setCloturerErr(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <XCircle size={14} className="text-red-500" />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-red-700">Clôturer mon compte</div>
                  <div className="text-[10px] text-slate-400">Anonymise vos données personnelles — irréversible</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal clôture */}
      {cloturerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div className="text-[14px] font-bold text-slate-900">Clôturer mon compte</div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5 text-[11px] text-amber-800">
              <div className="font-semibold">Avant de continuer :</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Votre nom, email et téléphone seront anonymisés.</li>
                <li>Votre wallet et carte seront fermés.</li>
                <li>Vos transactions sont conservées 5 ans (obligation légale).</li>
                <li>Cette action est <strong>irréversible</strong>.</li>
              </ul>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1.5">
                Tapez <strong className="text-red-600 font-mono">CLOTURER</strong> pour confirmer
              </label>
              <input
                type="text"
                value={confirmCloture}
                onChange={e => setConfirmCloture(e.target.value)}
                placeholder="CLOTURER"
                className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            {cloturerErr && (
              <div className="text-[11px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{cloturerErr}</div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setCloturerOpen(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-[12px] font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Annuler
              </button>
              <button
                onClick={handleCloturer}
                disabled={confirmCloture !== 'CLOTURER' || cloturerLoading}
                className="flex-1 bg-red-600 text-white text-[12px] font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-red-700">
                {cloturerLoading ? 'Traitement…' : 'Clôturer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
