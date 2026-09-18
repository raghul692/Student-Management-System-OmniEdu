import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={twMerge(clsx('flex flex-col items-center justify-center gap-3', className))}>
      <div
        className={clsx(
          'rounded-full border-brand-500 border-t-transparent animate-spin shrink-0',
          sizeMap[size]
        )}
      />
      {label && <p className="text-xs text-slate-400 animate-pulse">{label}</p>}
    </div>
  );
};
