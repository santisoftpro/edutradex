import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepPillProps {
  active: boolean;
  completed: boolean;
  label: string;
  stepNumber: number;
}

export function StepPill({ active, completed, label, stepNumber }: StepPillProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
          completed || active ? 'bg-[#1079ff] text-white ring-4 ring-[#1079ff]/30' : 'bg-slate-700 text-slate-400'
        )}
      >
        {completed ? <Check className="h-5 w-5" /> : stepNumber}
      </div>
      <span className={cn('text-xs font-medium', active || completed ? 'text-[#1079ff]' : 'text-slate-400')}>
        {label}
      </span>
    </div>
  );
}
