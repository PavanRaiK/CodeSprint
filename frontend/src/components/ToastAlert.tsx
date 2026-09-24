import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ToastAlertProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col space-y-2 pointer-events-none select-none">
      {toasts.map(toast => {
        let borderClass = 'border-signal/50';
        let bgClass = 'bg-charcoal/95';
        let icon = <Info className="w-4 h-4 text-signal shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-mapgreen/50';
          icon = <CheckCircle className="w-4 h-4 text-mapgreen shrink-0" />;
        } else if (toast.type === 'warning' || toast.type === 'error') {
          borderClass = 'border-mapred/50';
          icon = <AlertTriangle className="w-4 h-4 text-mapred shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-80 p-3.5 rounded-card ${bgClass} border ${borderClass} shadow-2xl backdrop-blur-md flex items-start space-x-3 transition-all duration-300 animate-in slide-in-from-top-4`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">{toast.title}</div>
              <div className="text-[11px] text-fog mt-0.5 leading-snug">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded text-fog hover:text-white transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
