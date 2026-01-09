import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function Button({
  children,
  onClick,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:from-slate-800 hover:to-black shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white/60 backdrop-blur-md border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white/80',
    ghost: 'text-slate-600 hover:bg-white/60',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}
