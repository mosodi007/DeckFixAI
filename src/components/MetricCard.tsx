import { ProgressBar } from './ui/ProgressBar';

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
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <ProgressBar value={value} max={max} />
      {isClickable && (
        <button
          onClick={onClick}
          className="mt-3 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          See Feedback
        </button>
      )}
    </>
  );

  if (isClickable) {
    return (
      <div className="w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 hover:border-slate-300 hover:bg-white/60 hover:shadow-lg transition-all text-left">
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
