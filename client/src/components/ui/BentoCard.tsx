import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BentoCardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  metric?: string | number;
  metricLabel?: string;
  metricTrend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'none';
  className?: string;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  badge,
  action,
  metric,
  metricLabel,
  metricTrend,
  accentColor = 'none',
  className,
  onClick,
}) => {
  const accentBorders = {
    none: '',
    indigo: 'border-t-2 border-t-brand-500 shadow-glow-indigo/10',
    emerald: 'border-t-2 border-t-emerald-500 shadow-glow-emerald/10',
    amber: 'border-t-2 border-t-amber-500 shadow-amber-500/10',
    rose: 'border-t-2 border-t-rose-500 shadow-glow-rose/10',
    cyan: 'border-t-2 border-t-cyan-500 shadow-cyan-500/10',
  };

  return (
    <motion.div
      whileHover={onClick ? { y: -3, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-2xl p-5 md:p-6 transition-all duration-200',
          'bg-surface/80 dark:bg-obsidian-card/90 backdrop-blur-xl',
          'border border-slate-200/80 dark:border-white/[0.08]',
          'shadow-sm dark:shadow-2xl dark:shadow-black/40',
          onClick && 'cursor-pointer hover:border-brand-500/40 dark:hover:border-brand-500/40',
          accentBorders[accentColor],
          className
        )
      )}
    >
      {/* Subtle radial ambient highlight */}
      <div className="absolute -right-12 -top-12 w-36 h-36 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header section */}
      {(title || icon || action || badge) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-brand-600 dark:text-brand-400 shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      )}

      {/* Metric highlight if present */}
      {metric !== undefined && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
              {metric}
            </span>
            {metricTrend && (
              <span
                className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded-full border',
                  metricTrend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                )}
              >
                {metricTrend.isPositive ? '↑ ' : '↓ '}
                {metricTrend.value}
              </span>
            )}
          </div>
          {metricLabel && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
              {metricLabel}
            </p>
          )}
        </div>
      )}

      {/* Card Body */}
      {children && <div className="relative z-10">{children}</div>}
    </motion.div>
  );
};
