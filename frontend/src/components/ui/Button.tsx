import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'joyero';
  size?: 'sm' | 'md' | 'lg' | 'workbench';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-md';

    const variants = {
      primary:
        'bg-[#176B52] text-white hover:bg-[#125541] active:bg-[#0e4434] focus:ring-[#176B52] shadow-sm',
      gold:
        'bg-[#A57525] text-white hover:bg-[#8e641e] active:bg-[#785418] focus:ring-[#A57525] shadow-sm',
      outline:
        'border border-[#DDE3E0] bg-white text-[#17201D] hover:bg-[#EEF1F0] hover:text-[#176B52] focus:ring-[#176B52]',
      secondary:
        'bg-[#EEF1F0] text-[#17201D] hover:bg-[#DDE3E0] focus:ring-[#66736D]',
      ghost:
        'text-[#66736D] hover:bg-[#EEF1F0] hover:text-[#17201D] focus:ring-[#DDE3E0]',
      destructive:
        'bg-[#FDECEA] text-[#B42318] hover:bg-[#fbd3cf] active:bg-[#f9bcb6] border border-[#fbd3cf] focus:ring-[#B42318]',
      joyero:
        'bg-[#176B52] text-white hover:bg-[#125541] active:scale-[0.98] shadow-md border-2 border-[#125541] font-semibold text-lg',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
      workbench: 'px-6 py-3.5 text-lg min-h-[52px]', // Optimizado para uso ergonómico en banco de joyero
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
