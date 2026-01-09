interface ProgressBarProps {
  value: number;
  max: number;
  height?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ value, max, height = 'sm' }: ProgressBarProps) {
  const percentage = (value / max) * 100;

  const getBarColor = (percent: number) => {
    if (percent >= 80) return 'from-green-500 to-green-600';
    if (percent >= 60) return 'from-yellow-500 to-green-500';
    if (percent >= 40) return 'from-orange-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
  };

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={`w-full bg-slate-200/50 rounded-full ${heightClasses[height]} overflow-hidden`}>
      <div
        className={`h-full bg-gradient-to-r ${getBarColor(percentage)} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
