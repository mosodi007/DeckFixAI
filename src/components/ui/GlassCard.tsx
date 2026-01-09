interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
}

export function GlassCard({ children, className = '', blur = 'xl' }: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  return (
    <div className={`bg-white/50 ${blurClasses[blur]} rounded-xl border border-white/60 ${className}`}>
      {children}
    </div>
  );
}
