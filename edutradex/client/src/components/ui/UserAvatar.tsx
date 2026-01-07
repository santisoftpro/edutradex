'use client';

import { User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvatarVariant = 'user' | 'admin' | 'superadmin';

interface UserAvatarProps {
  variant?: AvatarVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<AvatarVariant, string> = {
  user: 'bg-gradient-to-br from-[#1079ff] to-[#092ab2] shadow-lg shadow-[#1079ff]/20',
  admin: 'bg-red-600',
  superadmin: 'bg-amber-600',
};

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function UserAvatar({
  variant = 'user',
  size = 'sm',
  className,
}: UserAvatarProps) {
  const Icon = variant === 'superadmin' ? Crown : User;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <Icon className={cn('text-white', iconSizes[size])} />
    </div>
  );
}
