'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'admin' | 'superadmin' | 'live' | 'demo';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-slate-300',
  success: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  admin: 'bg-red-900/50 text-red-400',
  superadmin: 'bg-amber-900/50 text-amber-400',
  live: 'bg-emerald-500/30 text-emerald-300',
  demo: 'bg-amber-500/30 text-amber-300',
};

const sizeStyles = {
  xs: 'text-[10px] px-1 py-0.5',
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'font-bold rounded inline-flex items-center',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
