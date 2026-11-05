import React from 'react';
import { Card } from '../ui/Card.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#FAF5E8] text-[#D4AF37] border border-[#D4AF37]/30',
  valueClassName = 'text-[#0B1120]',
  isLoading = false
}) => {
  return (
    <Card bodyClassName="p-4" className="border border-slate-200/90 hover:border-[#D4AF37]/60 shadow-subtle hover:shadow-gold transition-all duration-200">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-28 mb-1" />
      ) : (
        <div className={`text-2xl font-extrabold tracking-tight ${valueClassName}`}>
          {value}
        </div>
      )}
      {subtitle && (
        <p className="text-[11px] text-[#6E5513] font-medium mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
};
