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
    </>
  );

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className="w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 hover:border-slate-300 hover:bg-white/60 hover:shadow-lg transition-all cursor-pointer text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border border-white/60">
      {content}
    </div>
  );
}
