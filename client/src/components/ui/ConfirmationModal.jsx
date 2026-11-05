import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action may not be reversible.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}) => {
  const icons = {
    danger: <AlertCircle className="w-6 h-6 text-rose-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-[#D4AF37]" />
  };

  const bgStyles = {
    danger: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-[#FAF5E8] border-[#D4AF37]/30'
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button
        type="button"
        variant={variant === 'danger' ? 'danger' : 'primary'}
        size="sm"
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
    >
      <div className="flex items-start gap-3.5 py-1">
        <div className={`p-2.5 rounded-xl border shrink-0 ${bgStyles[variant] || bgStyles.danger}`}>
          {icons[variant] || icons.danger}
        </div>
        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-0.5">
          {message}
        </div>
      </div>
    </Modal>
  );
};
