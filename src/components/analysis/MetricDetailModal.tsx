import { X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string | number;
  feedback: string | null;
  icon: React.ComponentType<{ className?: string }>;
}

export function MetricDetailModal({ isOpen, onClose, title, value, feedback, icon: Icon }: MetricDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <GlassCard className="max-w-2xl w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{title}</h2>
            <p className="text-3xl font-bold text-blue-600">{value}</p>
          </div>
        </div>

        {feedback ? (
          <div className="space-y-4">
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Detailed Analysis
              </h3>
              <p className="text-slate-700 leading-relaxed">
                {feedback}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-slate-500 italic">
              No detailed feedback available for this metric yet.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
