import React from 'react';

export const Skeleton = ({
  className = '',
  variant = 'rectangular'
}) => {
  const variantStyles = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded-md h-4'
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200/80 ${variantStyles[variant] || variantStyles.rectangular} ${className}`}
    />
  );
};
