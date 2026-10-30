import React from 'react';
import { Card } from '../ui/Card.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-slate-100 text-slate-700',
  valueClassName = 'text-slate-900',
  isLoading = false
}) => {
  return (
    <Card bodyClassName="p-4">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-medium">{title}</span>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-28 mb-1" />
      ) : (
        <div className={`text-xl font-bold tracking-tight ${valueClassName}`}>
          {value}
        </div>
      )}
      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
};
