import React from 'react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Construction } from 'lucide-react';

export const PlaceholderPage = ({ title, stage, description }) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0B1120]">{title}</h2>
          <Badge variant="gold">Stage {stage}</Badge>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <Card bodyClassName="p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FAF5E8] border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mb-3 shadow-xs">
          <Construction className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#0B1120]">
          {title} Module Scheduled for Stage {stage}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
          The database schema and foundation are ready. Full business logic, CRUD endpoints, and interactive UI views will be implemented in Stage {stage} according to the development roadmap.
        </p>
      </Card>
    </div>
  );
};
