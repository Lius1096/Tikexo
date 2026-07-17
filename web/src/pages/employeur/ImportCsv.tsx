import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImportCsvBeneficiaires from '../../components/ImportCsvBeneficiaires';

export default function EmployeurImportCsv() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const entrepriseId = user?.entrepriseId;

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 pt-4 pb-5">
        <button
          onClick={() => navigate('/employeur/beneficiaires')}
          className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 mb-4 transition-colors"
        >
          <ArrowLeft size={13} />Bénéficiaires / Import CSV
        </button>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Importer des bénéficiaires en masse</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Téléversez un fichier CSV pour créer ou mettre à jour vos bénéficiaires en une seule opération.
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-6">
        <ImportCsvBeneficiaires entrepriseId={entrepriseId} onFinish={() => navigate('/employeur/beneficiaires')} />
      </div>
    </div>
  );
}
