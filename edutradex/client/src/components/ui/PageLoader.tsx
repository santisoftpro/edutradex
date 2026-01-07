'use client';

import { CandlestickLoader } from './CandlestickLoader';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <CandlestickLoader message={message} />
    </div>
  );
}
