interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  color: 'blue' | 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
  onClick?: () => void;
}

export function MetricCard({ label, value, max, color, onClick }: MetricCardProps) {
  const percentage = (value / max) * 100;

  const getBarColor = (percent: number) => {
    if (percent >= 80) return 'from-green-500 to-green-600';
    if (percent >= 60) return 'from-yellow-500 to-green-500';
    if (percent >= 40) return 'from-orange-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 hover:border-slate-300 hover:bg-white/60 hover:shadow-lg transition-all cursor-pointer text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getBarColor(percentage)} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </button>
  );
}
