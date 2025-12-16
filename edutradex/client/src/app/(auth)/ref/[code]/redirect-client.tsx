'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectToRegisterProps {
  code: string;
}

export function RedirectToRegister({ code }: RedirectToRegisterProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/register?ref=${code}`);
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Redirecting to registration...</p>
      </div>
    </div>
  );
}
