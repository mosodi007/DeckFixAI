interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', blur = 'xl', hover = true, onClick }: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-300' : '';

  return (
    <div
      className={`bg-white/60 ${blurClasses[blur]} rounded-xl border border-slate-200/60 ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
