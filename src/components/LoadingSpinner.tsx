import { Sparkles, FileText, TrendingUp } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading your analysis...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#000">
      <div className="text-center max-w-md px-6">
        {/* Animated Logo/Icon */}
        <div className="relative mb-8">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-[#000] rounded-full animate-spin border-t-blue-600"></div>
          </div>
          {/* Middle pulsing ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* <div className="w-20 h-20 border-4 border-[#000] rounded-full animate-pulse border-t-[#000]"></div> */}
          </div>
          {/* Inner icon */}
          <div className="relative flex items-center justify-center w-16 h-16 mx-auto">
            {/* <div className="absolute inset-0 bg-[#000] rounded-full animate-pulse"></div> */}
            {/* <Sparkles className="w-4 h-4 text-white relative z-10 animate-bounce" /> */}
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 animate-pulse">
            {message}
          </h2>
          <p className="text-slate-600 text-sm">
            Preparing your comprehensive pitch deck analysis
          </p>
        </div>

        {/* Animated Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-{#000} rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Feature Icons */}
        
      </div>
    </div>
  );
}

