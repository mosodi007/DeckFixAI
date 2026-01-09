import { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Check } from 'lucide-react';

const analysisSteps = [
  'Extracting content and structure',
  'Analyzing market opportunity and traction',
  'Evaluating team and execution capability',
  'Assessing financial projections',
  'Comparing against successful funding patterns',
  'Generating recommendations'
];

export function AnalysisProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    if (currentStep < analysisSteps.length) {
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => Math.min(prev + 1, analysisSteps.length));
      }, 3000);

      return () => clearInterval(stepInterval);
    }
  }, [currentStep]);

  return (
    <GlassCard className="mt-8 p-6">
      <h4 className="font-semibold text-slate-900 mb-4">
        Analyzing your pitch deck{dots}
      </h4>
      <div className="space-y-3">
        {analysisSteps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isPending ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 bg-slate-700 rounded-full animate-pulse" />
                ) : (
                  <div className="w-5 h-5 bg-slate-300 rounded-full" />
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  isCompleted
                    ? 'text-slate-500 line-through'
                    : isCurrent
                    ? 'text-slate-900 font-medium'
                    : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
