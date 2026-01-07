'use client';

interface CandlestickLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CandlestickLoader({
  message = 'Loading...',
  size = 'md'
}: CandlestickLoaderProps) {
  const sizeClasses = {
    sm: { gap: 'gap-1', height: 'h-10', wick: 'w-0.5', body: 'w-2' },
    md: { gap: 'gap-1.5', height: 'h-16', wick: 'w-0.5', body: 'w-3' },
    lg: { gap: 'gap-2', height: 'h-20', wick: 'w-1', body: 'w-4' },
  };

  const s = sizeClasses[size];

  return (
    <div className="text-center">
      <div className={`flex items-end justify-center ${s.gap} ${s.height} mb-4`}>
        <div className="flex flex-col items-center animate-candle-1">
          <div className={`${s.wick} h-2 bg-blue-500/60 rounded-full`} />
          <div className={`${s.body} h-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20`} />
          <div className={`${s.wick} h-1.5 bg-blue-500/60 rounded-full`} />
        </div>
        <div className="flex flex-col items-center animate-candle-2">
          <div className={`${s.wick} h-3 bg-red-500/60 rounded-full`} />
          <div className={`${s.body} h-6 bg-gradient-to-t from-red-600 to-red-400 rounded-sm shadow-lg shadow-red-500/20`} />
          <div className={`${s.wick} h-2 bg-red-500/60 rounded-full`} />
        </div>
        <div className="flex flex-col items-center animate-candle-3">
          <div className={`${s.wick} h-1.5 bg-blue-500/60 rounded-full`} />
          <div className={`${s.body} h-10 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20`} />
          <div className={`${s.wick} h-2.5 bg-blue-500/60 rounded-full`} />
        </div>
        <div className="flex flex-col items-center animate-candle-4">
          <div className={`${s.wick} h-2.5 bg-red-500/60 rounded-full`} />
          <div className={`${s.body} h-5 bg-gradient-to-t from-red-600 to-red-400 rounded-sm shadow-lg shadow-red-500/20`} />
          <div className={`${s.wick} h-1.5 bg-red-500/60 rounded-full`} />
        </div>
        <div className="flex flex-col items-center animate-candle-5">
          <div className={`${s.wick} h-1 bg-blue-500/60 rounded-full`} />
          <div className={`${s.body} h-12 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20`} />
          <div className={`${s.wick} h-2 bg-blue-500/60 rounded-full`} />
        </div>
      </div>
      {message && (
        <p className="text-slate-400 text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
