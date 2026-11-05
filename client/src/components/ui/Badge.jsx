import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = ''
}) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    error: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    danger: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    info: 'bg-[#FAF5E8] text-[#917118] border-[#D4AF37]/50 font-semibold',
    gold: 'bg-[#FAF5E8] text-[#917118] border-[#D4AF37]/60 font-semibold',
    navy: 'bg-[#0B1120] text-[#D4AF37] border-[#D4AF37]/40 font-semibold',
    primary: 'bg-[#0B1120] text-[#D4AF37] border-[#D4AF37]/40 font-semibold',
    wholesale: 'bg-[#0B1120] text-[#D4AF37] border-[#D4AF37]/40 font-bold tracking-wider',
    retail: 'bg-[#FAF5E8] text-[#917118] border-[#D4AF37]/60 font-bold tracking-wider'
  };

  const sizes = {
    sm: 'text-[10px] sm:text-[11px] px-2 py-0.5 font-medium rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-md gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center select-none border transition-colors ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
};
