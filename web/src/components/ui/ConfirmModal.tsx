import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  titre: string;
  message: string;
  labelConfirmer?: string;
  danger?: boolean;
  isPending?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}

export function ConfirmModal({
  titre, message, labelConfirmer = 'Confirmer', danger = false,
  isPending = false, onConfirmer, onAnnuler,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle size={16} className={danger ? 'text-red-500' : 'text-amber-500'} />
            </div>
            <div className="text-[13px] font-medium text-slate-900">{titre}</div>
          </div>
          <button onClick={onAnnuler} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onAnnuler}
            className="flex-1 border border-slate-200 text-slate-600 text-sm py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirmer}
            disabled={isPending}
            className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-tikexo-primary text-white hover:bg-tikexo-accent'
            }`}
          >
            {isPending ? 'En cours…' : labelConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
