import { LucideIcon } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
}

export function FeatureCard({ icon: Icon, title, description, iconColor = 'border-slate-200' }: FeatureCardProps) {
  return (
    <GlassCard className="p-6">
      <div className={`w-12 h-12 bg-white/60 backdrop-blur-md rounded-lg flex items-center justify-center mb-4 border ${iconColor}`}>
        <Icon className="w-6 h-6 text-slate-700" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </GlassCard>
  );
}
