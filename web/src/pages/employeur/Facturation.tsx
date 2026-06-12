import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function EmployeurFacturation() {
  return (
    <div className="p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Facturation</div>
      <div className="text-xs text-slate-500 mb-4">Factures et justificatifs TIKEXO</div>
      <div className="bg-white border border-slate-100 rounded-lg flex flex-col items-center justify-center py-20 gap-3">
        <FileSpreadsheet size={32} className="text-slate-200" />
        <div className="text-sm text-slate-500">Module facturation — disponible prochainement</div>
        <div className="text-xs text-slate-400">Les factures mensuelles seront disponibles ici</div>
      </div>
    </div>
  );
}
