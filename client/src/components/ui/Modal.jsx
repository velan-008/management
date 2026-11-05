import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className = '',
  bodyClassName = 'px-6 py-5',
  hideCloseButton = false
}) => {
  // Handle escape key press
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
    max: 'max-w-7xl'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal modal-container fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      {/* Backdrop */}
      <div
        className="modal-overlay modal-backdrop fixed inset-0 bg-[#0B1120]/75 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Window */}
      <div
        className={`modal-content modal-window relative bg-white border border-[#D4AF37]/40 rounded-2xl shadow-2xl w-full ${
          sizes[size] || sizes.md
        } max-h-[92vh] flex flex-col overflow-hidden my-auto z-10 ${className}`}
      >
        {/* Top Gold Accent Bar */}
        <div className="no-print h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#F4E7C4] to-[#D4AF37] shrink-0" />

        {/* Fixed Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FAF5E8]/30 shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-bold text-[#0B1120] tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-[#0B1120] hover:bg-[#FAF5E8] p-1.5 rounded-lg transition-colors shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className={`modal-body flex-1 overflow-y-auto ${bodyClassName} overscroll-contain`}>
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="no-print px-6 py-3.5 border-t border-slate-100 bg-[#F8F8F8] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
