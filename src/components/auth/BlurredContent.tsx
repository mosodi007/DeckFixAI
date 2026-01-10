import { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface BlurredContentProps {
  children: ReactNode;
  isBlurred: boolean;
  onSignUpClick: () => void;
}

export function BlurredContent({ children, isBlurred, onSignUpClick }: BlurredContentProps) {
  if (!isBlurred) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="filter blur-md pointer-events-none select-none">
        {children}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 border-2 border-slate-200">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Hidden Insight
            </h3>
            <p className="text-slate-600 mb-6">
              Sign up for free to unlock detailed insights and take action on improvements
            </p>
            <button
              onClick={onSignUpClick}
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg"
            >
              Sign Up for Free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
