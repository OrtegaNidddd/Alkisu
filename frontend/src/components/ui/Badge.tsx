import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-[#E6F5ED] text-[#17734B] border border-[#c1e7d4]',
    warning: 'bg-[#FFF4D6] text-[#9A6700] border border-[#fce49f]',
    error: 'bg-[#FDECEA] text-[#B42318] border border-[#f9c5c0]',
    info: 'bg-[#EAF1FC] text-[#2457A6] border border-[#c6daf7]',
    gold: 'bg-[#FAF1DA] text-[#A57525] border border-[#eedab1]',
    neutral: 'bg-[#EEF1F0] text-[#66736D] border border-[#DDE3E0]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium leading-none select-none tracking-wide',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
