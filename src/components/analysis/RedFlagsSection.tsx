import { AlertTriangle, Flame, AlertOctagon } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { BlurredContent } from '../auth/BlurredContent';

interface RedFlag {
  category: string;
  severity: string;
  title: string;
  description: string;
  impact: string;
}

interface RedFlagsSectionProps {
  redFlags: RedFlag[];
  isAuthenticated: boolean;
  onSignUpClick: () => void;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertOctagon,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'Critical'
      };
    case 'major':
      return {
        icon: Flame,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        label: 'Major'
      };
    default:
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        label: 'Moderate'
      };
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    financial: 'Financial',
    team: 'Team',
    market: 'Market',
    product: 'Product',
    competition: 'Competition',
    traction: 'Traction',
    other: 'Other'
  };
  return labels[category] || category;
}

export function RedFlagsSection({ redFlags, isAuthenticated, onSignUpClick }: RedFlagsSectionProps) {
  if (!redFlags || redFlags.length === 0) {
    return null;
  }

  const criticalFlags = redFlags.filter(f => f.severity === 'critical');
  const majorFlags = redFlags.filter(f => f.severity === 'major');
  const moderateFlags = redFlags.filter(f => f.severity === 'moderate');

  return (
    <GlassCard className="p-6 mb-8">
      <BlurredContent isBlurred={!isAuthenticated} onSignUpClick={onSignUpClick}>
      <div className="flex items-center gap-2 mb-6">
        <AlertOctagon className="w-6 h-6 text-red-600" />
        <h3 className="text-xl font-bold text-slate-900">Red Flags Detected</h3>
        <span className="ml-auto text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {redFlags.length} {redFlags.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      <div className="space-y-4">
        {criticalFlags.length > 0 && (
          <div className="space-y-3">
            {criticalFlags.map((flag, index) => {
              const config = getSeverityConfig(flag.severity);
              const Icon = config.icon;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                          {getCategoryLabel(flag.category)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{flag.title}</h4>
                      <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-900">Impact: </span>
                        <span className="text-slate-700">{flag.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {majorFlags.length > 0 && (
          <div className="space-y-3">
            {majorFlags.map((flag, index) => {
              const config = getSeverityConfig(flag.severity);
              const Icon = config.icon;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                          {getCategoryLabel(flag.category)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{flag.title}</h4>
                      <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-900">Impact: </span>
                        <span className="text-slate-700">{flag.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {moderateFlags.length > 0 && (
          <div className="space-y-3">
            {moderateFlags.map((flag, index) => {
              const config = getSeverityConfig(flag.severity);
              const Icon = config.icon;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                          {getCategoryLabel(flag.category)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{flag.title}</h4>
                      <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-900">Impact: </span>
                        <span className="text-slate-700">{flag.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </BlurredContent>
    </GlassCard>
  );
}
