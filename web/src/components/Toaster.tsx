import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  size={16} />,
  error  : <XCircle      size={16} />,
  warning: <AlertTriangle size={16} />,
  info   : <Info          size={16} />,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-green-500  text-slate-800',
  error  : 'bg-white border-l-4 border-red-500    text-slate-800',
  warning: 'bg-white border-l-4 border-amber-400  text-slate-800',
  info   : 'bg-white border-l-4 border-blue-500   text-slate-800',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-500',
  error  : 'text-red-500',
  warning: 'text-amber-500',
  info   : 'text-blue-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const ctx: ToastCtx = {
    toast,
    success: (m) => toast(m, 'success'),
    error  : (m) => toast(m, 'error'),
    warning: (m) => toast(m, 'warning'),
    info   : (m) => toast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Conteneur fixe — bas droite */}
      <div className="fixed bottom-5 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 pointer-events-auto',
              'animate-[slideUp_0.2s_ease-out]',
              STYLES[t.type],
            )}
          >
            <span className={clsx('mt-0.5 shrink-0', ICON_STYLES[t.type])}>
              {ICONS[t.type]}
            </span>
            <p className="text-xs leading-snug flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
