import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  badge,
  icon: Icon,
  className = '',
  bodyClassName = 'p-5',
  headerClassName = 'px-5 py-4 border-b border-slate-100',
  accentTop = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 hover:border-[#D4AF37]/50 rounded-xl shadow-subtle transition-all duration-200 overflow-hidden ${className}`}
      {...props}
    >
      {accentTop && (
        <div className="h-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E7C4] to-[#D4AF37]" />
      )}
      {(title || subtitle || action || badge || Icon) && (
        <div className={`flex flex-wrap items-center justify-between gap-3 ${headerClassName}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-[#FAF5E8] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {title && <h3 className="text-sm font-bold text-[#0B1120] tracking-tight truncate">{title}</h3>}
                {badge && <div>{badge}</div>}
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};
