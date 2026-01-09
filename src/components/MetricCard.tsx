interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  color: 'blue' | 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
  onClick?: () => void;
}

export function MetricCard({ label, value, max, color, onClick }: MetricCardProps) {
  const percentage = (value / max) * 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    cyan: 'bg-cyan-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    pink: 'bg-pink-50',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg ${bgColorClasses[color]} border border-${color}-200 hover:border-${color}-400 hover:shadow-md transition-all cursor-pointer text-left`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <div className="w-full bg-white rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </button>
  );
}
