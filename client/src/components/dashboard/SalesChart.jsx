import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export const SalesChart = ({
  salesTrend = [],
  periodDays = 7,
  currency = '$',
  isLoading = false
}) => {
  const hasSales = salesTrend && salesTrend.length > 0 && !salesTrend.every((d) => d.sales === 0);

  return (
    <Card
      className="lg:col-span-2"
      title="Sales Performance Trend"
      subtitle={`Daily revenue for the last ${periodDays} days`}
      action={
        <Badge variant="neutral">
          <Sparkles className="w-3 h-3 text-indigo-500 mr-1" />
          Live DB Aggregation
        </Badge>
      }
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </div>
      ) : !hasSales ? (
        <div className="h-64 flex items-center justify-center">
          <EmptyState
            title="No sales in selected period"
            description="Transactions created in this period will plot on this interactive chart."
          />
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => `${currency}${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(val) => [`${currency}${parseFloat(val).toFixed(2)}`, 'Sales Revenue']}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#0F172A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
