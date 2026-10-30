import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">404 — Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
        The page you are looking for does not exist or has been moved to another location.
      </p>
      <Button
        variant="primary"
        size="md"
        icon={ArrowLeft}
        onClick={() => navigate('/')}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};
