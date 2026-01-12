import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, suffix, valueClassName = 'text-slate-900', onClick }: StatCardProps) {
  const clickableClass = onClick ? 'cursor-pointer hover:scale-105 transition-transform' : '';

  return (
    <GlassCard
      blur="md"
      className={`p-6 ${clickableClass}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${valueClassName}`}>
          {typeof value === 'number' 
            ? (value % 1 === 0 ? value : parseFloat(value.toFixed(1)))
            : value}
        </span>
        {suffix && <span className="text-lg text-slate-600">{suffix}</span>}
      </div>
      {onClick && (
        <div className="mt-3 text-xs text-slate-500">
          Click for details
        </div>
      )}
    </GlassCard>
  );
}
