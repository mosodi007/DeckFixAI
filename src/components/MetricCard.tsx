import { ProgressBar } from './ui/ProgressBar';
import { ChevronRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  color: 'blue' | 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
  onClick?: () => void;
}

export function MetricCard({ label, value, max, onClick }: MetricCardProps) {
  const isClickable = !!onClick;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <span className="text-xl font-bold text-slate-900">{value}</span>
          </div>
          {isClickable && (
            <div className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors">
              Click for detailed feedback
            </div>
          )}
        </div>
        {isClickable && (
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all ml-2 flex-shrink-0" />
        )}
      </div>
      <ProgressBar value={value} max={max} />
    </>
  );

  if (isClickable) {
    return (
      <div
        onClick={onClick}
        className="group w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border-2 border-slate-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] text-left"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border border-white/60">
      {content}
    </div>
  );
}
