import React from 'react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export const RecentTransactions = ({
  transactions = [],
  currency = '$',
  isLoading = false
}) => {
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card
      title="Recent Invoices & Transactions"
      subtitle="Latest sales processed in the store"
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState
          title="No transactions recorded"
          description="Completed sales and invoices will be listed here in real-time."
        />
      ) : (
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-5">Invoice #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Cashier</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                <th className="py-2.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 font-mono font-semibold text-slate-900">
                    {tx.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {tx.invoiceDate}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {tx.customerName}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {tx.cashierName}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatCurrency(tx.grandTotal)}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Badge
                      variant={
                        tx.paymentStatus === 'PAID'
                          ? 'success'
                          : tx.paymentStatus === 'PARTIALLY_PAID'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {tx.paymentStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
