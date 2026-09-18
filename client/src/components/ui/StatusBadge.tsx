import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeType =
  | 'PRESENT'
  | 'ABSENT'
  | 'ON_DUTY'
  | 'LATE'
  | 'HALF_DAY'
  | 'ELIGIBLE'
  | 'CONDONATION'
  | 'DETAINED'
  | 'SA'
  | 'RA'
  | 'COLLEGE'
  | 'SCHOOL'
  | 'GROUP_TRUST'
  | 'GRADE_PASS'
  | 'GRADE_ARREAR'
  | 'NEUTRAL';

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  label,
  size = 'md',
  pulse,
  className,
}) => {
  // Infer badge type if not explicitly supplied
  const normalized = (type || status).toUpperCase() as BadgeType;
  const displayText = label || status.replace(/_/g, ' ');

  const styleMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    PRESENT: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    ELIGIBLE: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    GRADE_PASS: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    ABSENT: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    GRADE_ARREAR: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    RA: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    CONDONATION: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    },
    WARNING: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    },
    DETAINED: {
      bg: 'bg-red-600/15 dark:bg-red-600/20',
      text: 'text-red-600 dark:text-red-400 font-bold',
      border: 'border-red-500/40',
      dot: 'bg-red-500 animate-ping',
    },
    SA: {
      bg: 'bg-red-600/15 dark:bg-red-600/20',
      text: 'text-red-600 dark:text-red-400 font-bold',
      border: 'border-red-500/40',
      dot: 'bg-red-500 animate-ping',
    },
    ON_DUTY: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-500/20 dark:border-cyan-500/30',
      dot: 'bg-cyan-500',
    },
    COLLEGE: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      text: 'text-indigo-600 dark:text-indigo-400 font-semibold',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      dot: 'bg-indigo-500',
    },
    SCHOOL: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      text: 'text-purple-600 dark:text-purple-400 font-semibold',
      border: 'border-purple-500/20 dark:border-purple-500/30',
      dot: 'bg-purple-500',
    },
    GROUP_TRUST: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400 font-bold',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    NEUTRAL: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      dot: 'bg-slate-400',
    },
  };

  const style = styleMap[normalized] || styleMap.NEUTRAL;
  const shouldPulse = pulse ?? (normalized === 'DETAINED' || normalized === 'SA');

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider select-none',
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
          style.bg,
          style.text,
          style.border,
          className
        )
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', style.dot, shouldPulse && 'animate-pulse')} />
      <span>{displayText}</span>
    </span>
  );
};
