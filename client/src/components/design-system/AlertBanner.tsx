import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const typeConfig = {
  info: {
    container: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  },
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  },
  error: {
    container: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className,
}) => {
  const config = typeConfig[type];

  return (
    <div
      className={twMerge(
        clsx(
          'flex items-start gap-3 p-4 rounded-xl border text-sm backdrop-blur-md',
          config.container,
          className
        )
      )}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold mb-0.5 tracking-tight">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
