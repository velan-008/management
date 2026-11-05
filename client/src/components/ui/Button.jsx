import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 outline-none';

  const variants = {
    primary: 'bg-[#0B1120] text-[#D4AF37] hover:bg-[#162038] hover:text-[#F4E7C4] active:bg-[#060A14] border border-[#D4AF37]/40 shadow-sm font-semibold',
    gold: 'bg-[#D4AF37] text-[#0B1120] hover:bg-[#C59F2D] active:bg-[#B89326] shadow-sm font-bold',
    secondary: 'bg-white text-[#0B1120] hover:bg-[#FAF5E8] border border-slate-200 active:bg-slate-100 shadow-xs',
    outline: 'border border-slate-300 bg-white text-[#0B1120] hover:bg-[#FAF5E8] hover:border-[#D4AF37] active:bg-slate-100 shadow-xs',
    ghost: 'text-slate-700 hover:text-[#0B1120] hover:bg-[#FAF5E8] active:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm font-semibold'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 h-9 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 h-11 gap-2.5 font-bold'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" />
      )}
      {children}
    </button>
  );
};
