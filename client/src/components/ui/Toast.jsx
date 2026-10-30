import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({
  id,
  type = 'info',
  message,
  onClose
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
  };

  const styles = {
    success: 'bg-emerald-50 text-emerald-950 border-emerald-200',
    error: 'bg-rose-50 text-rose-950 border-rose-200',
    warning: 'bg-amber-50 text-amber-950 border-amber-200',
    info: 'bg-white text-slate-800 border-slate-200'
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-popup transition-all duration-200 text-sm ${
        styles[type] || styles.info
      }`}
    >
      {icons[type] || icons.info}
      <div className="flex-1 font-medium leading-snug">{message}</div>
      {onClose && (
        <button
          onClick={() => onClose(id)}
          className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
