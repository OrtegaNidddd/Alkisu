import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  unitSuffix?: string;
  isBalanceInput?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, unitSuffix, isBalanceInput, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#17201D]">
            {label}
            {isBalanceInput && (
              <span className="ml-1.5 text-[10px] text-[#A57525] font-normal normal-case">
                (Precisión 3 decimales 0.000g)
              </span>
            )}
          </label>
        )}
        <div className="relative rounded-md">
          <input
            ref={ref}
            type={type}
            step={isBalanceInput ? '0.001' : props.step}
            className={cn(
              'block w-full rounded-md border border-[#DDE3E0] bg-white px-3.5 py-2.5 text-sm text-[#17201D] placeholder:text-[#9CA9A3] transition-colors focus:border-[#176B52] focus:outline-none focus:ring-1 focus:ring-[#176B52]',
              error && 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]',
              isBalanceInput && 'font-mono text-base font-medium tracking-tight pr-12',
              unitSuffix && 'pr-12',
              className
            )}
            {...props}
          />
          {unitSuffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-xs font-semibold text-[#66736D] bg-[#EEF1F0] px-2 py-0.5 rounded border border-[#DDE3E0]">
                {unitSuffix}
              </span>
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#B42318] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#66736D]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
