import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Create Account - OptigoBroker',
  description: 'Create your OptigoBroker trading account',
};

function RegisterFormFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
