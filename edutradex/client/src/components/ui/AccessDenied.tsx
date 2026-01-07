'use client';

import { useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccessDeniedVariant = 'admin' | 'superadmin';

interface AccessDeniedProps {
  variant: AccessDeniedVariant;
  icon: LucideIcon;
  title: string;
  description: string;
  returnPath: string;
  returnLabel: string;
}

const variantStyles: Record<AccessDeniedVariant, {
  iconColor: string;
  buttonClass: string;
}> = {
  admin: {
    iconColor: 'text-red-500',
    buttonClass: 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff]',
  },
  superadmin: {
    iconColor: 'text-amber-500',
    buttonClass: 'bg-amber-600 hover:bg-amber-700',
  },
};

export function AccessDenied({
  variant,
  icon: Icon,
  title,
  description,
  returnPath,
  returnLabel,
}: AccessDeniedProps) {
  const router = useRouter();
  const styles = variantStyles[variant];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md p-8">
        <Icon className={cn('h-16 w-16 mx-auto', styles.iconColor)} />
        <h1 className="mt-6 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-4 text-slate-400">{description}</p>
        <button
          onClick={() => router.push(returnPath)}
          className={cn(
            'mt-6 px-6 py-3 text-white rounded-lg transition-all',
            styles.buttonClass
          )}
        >
          {returnLabel}
        </button>
      </div>
    </div>
  );
}
