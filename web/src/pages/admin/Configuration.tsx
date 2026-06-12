import React from 'react';
import { Settings } from 'lucide-react';

export default function AdminConfiguration() {
  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Configuration</div>
      <div className="text-xs text-slate-500 mb-4">Paramètres globaux de la plateforme TIKEXO</div>
      <div className="bg-white border border-slate-100 rounded-lg flex flex-col items-center justify-center py-20 gap-3">
        <Settings size={32} className="text-slate-200" />
        <div className="text-sm text-slate-500">Module configuration — disponible prochainement</div>
      </div>
    </div>
  );
}
