import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  glow = false,
  padding = 'md',
  onClick,
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  };

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'relative rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl overflow-hidden',
          hoverEffect && 'transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer',
          glow && 'ring-1 ring-brand-500/20 shadow-brand-500/10',
          paddingStyles[padding],
          className
        )
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={twMerge(clsx('flex items-start justify-between gap-4 pb-4 border-b border-slate-800/60', className))}>
    <div>
      <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={twMerge(clsx('pt-4', className))}>{children}</div>;
