import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(({
  label,
  id,
  name,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  options = [],
  placeholder,
  children,
  className = '',
  selectClassName = '',
  ...props
}, ref) => {
  const selectId = id || name;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[#0B1120] select-none flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full text-sm bg-white border rounded-lg px-3 py-2 pr-9 h-[38px] appearance-none transition-all duration-150 disabled:bg-[#F8F8F8] disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-300 text-[#0B1120] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none'
          } ${selectClassName}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value ?? opt.id} value={opt.value ?? opt.id}>
                  {opt.label ?? opt.name}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center shrink-0">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium leading-none">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 leading-none">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
