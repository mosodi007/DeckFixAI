import { GlassCard } from '../ui/GlassCard';
import { FileText } from 'lucide-react';

interface BusinessSummarySectionProps {
  summary: string;
}

export function BusinessSummarySection({ summary }: BusinessSummarySectionProps) {
  return (
    <GlassCard className="mb-8 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Business Summary</h2>
          <p className="text-sm text-slate-600">Executive overview of your pitch deck</p>
        </div>
      </div>

      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </p>
      </div>
    </GlassCard>
  );
}
