import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  rightIcon: RightIcon,
  className = '',
  inputClassName = '',
  ...props
}, ref) => {
  const inputId = id || name;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
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
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full text-sm bg-white border rounded-lg px-3 py-2 h-[38px] transition-all duration-150 disabled:bg-[#F8F8F8] disabled:text-slate-400 disabled:cursor-not-allowed ${
            Icon ? 'pl-9' : ''
          } ${
            RightIcon ? 'pr-9' : ''
          } ${
            error
              ? 'border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-300 text-[#0B1120] placeholder-slate-400 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none'
          } ${inputClassName}`}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center shrink-0">
            <RightIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium leading-none">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 leading-none">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
