import { XCircle, Lightbulb } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface DealBreaker {
  title: string;
  description: string;
  recommendation: string;
}

interface DealBreakersSectionProps {
  dealBreakers: DealBreaker[];
}

export function DealBreakersSection({ dealBreakers }: DealBreakersSectionProps) {
  if (!dealBreakers || dealBreakers.length === 0) {
    return null;
  }

  return (
    <GlassCard className="p-6 mb-8 border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-white">
      <div className="flex items-center gap-2 mb-6">
        <XCircle className="w-6 h-6 text-red-600" />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900">Deal-Breakers</h3>
          <p className="text-sm text-red-700 font-medium">
            Critical issues that make this deck not investment-ready
          </p>
        </div>
        <span className="text-sm font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">
          {dealBreakers.length} {dealBreakers.length === 1 ? 'blocker' : 'blockers'}
        </span>
      </div>

      <div className="space-y-4">
        {dealBreakers.map((breaker, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border-2 border-red-200 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-slate-900 text-lg">{breaker.title}</h4>
            </div>

            <div className="pl-8 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">Why this is critical:</p>
                <p className="text-sm text-slate-700">{breaker.description}</p>
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="text-xs font-semibold text-black-900 mb-1">Required Action:</p>
                    <p className="text-sm text-black-800">{breaker.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm font-semibold text-red-900">
          This deck should NOT be presented to investors until these deal-breakers are resolved.
        </p>
      </div>
    </GlassCard>
  );
}
