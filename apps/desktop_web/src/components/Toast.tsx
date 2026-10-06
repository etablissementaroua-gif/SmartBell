import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none" dir="rtl">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-slate-900/95 border-teal-500/50 text-white',
          icon: 'check_circle',
          iconColor: 'text-teal-400',
          accent: 'bg-teal-500',
        };
      case 'error':
        return {
          bg: 'bg-slate-900/95 border-red-500/50 text-white',
          icon: 'error',
          iconColor: 'text-red-400',
          accent: 'bg-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-slate-900/95 border-amber-500/50 text-white',
          icon: 'warning',
          iconColor: 'text-amber-400',
          accent: 'bg-amber-500',
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900/95 border-blue-500/50 text-white',
          icon: 'info',
          iconColor: 'text-blue-400',
          accent: 'bg-blue-500',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-3 ${style.bg}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10 ${style.iconColor}`}>
          <span className="material-symbols-outlined text-xl">{style.icon}</span>
        </div>
        <div className="flex flex-col min-w-0">
          {toast.title && <span className="font-bold text-xs leading-tight mb-0.5">{toast.title}</span>}
          <span className="text-xs text-slate-200 leading-snug">{toast.message}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors mr-2 flex-shrink-0"
        title="إغلاق"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
