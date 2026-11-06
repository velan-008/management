import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/businessServices.js';
import { exportTableToCsv, printReport } from './reportUtils.jsx';
import { Download, Printer, RefreshCw, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

export function ProfitLossReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [plData, setPlData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPL = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getProfitLoss({ date_from: dateFrom, date_to: dateTo });
      setPlData(res.data);
    } catch (err) {
      console.error('Failed to fetch P&L report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchPL();
  }, [fetchPL]);

  const rev = plData?.revenue || {};
  const grossSales = parseFloat(rev.grossSales) || 0;
  const discounts = parseFloat(rev.discounts) || 0;
  const refunds = parseFloat(rev.refunds) || 0;
  const netSales = parseFloat(rev.netSales) || 0;
  const cogs = parseFloat(plData?.costOfGoodsSold) || 0;
  const grossProfit = parseFloat(plData?.grossProfit) || 0;
  const expenses = parseFloat(plData?.operatingExpenses) || 0;
  const netProfit = parseFloat(plData?.netProfit) || 0;

  const grossMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : '0.0';
  const netMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : '0.0';

  const handleExportExcel = () => {
    const headers = ['Financial Statement Section', 'Line Item Description', 'Amount'];
    const rows = [
      ['Operating Revenue', 'Gross Invoiced Sales', grossSales],
      ['Operating Revenue', 'Less: Granted Discounts', -discounts],
      ['Operating Revenue', 'Less: Customer Returns & Refunds', -refunds],
      ['Operating Revenue', 'Net Operational Turnover', netSales],
      ['Direct Costs', 'Cost of Goods Sold (COGS)', -cogs],
      ['Direct Costs', 'Gross Operating Margin', grossProfit],
      ['Operating Expenses', 'Total Overhead Expenditures', -expenses],
      ['Net Profit / (Loss)', 'Net Operating Profit', netProfit]
    ];
    exportTableToCsv(`Profit-and-Loss-Statement-${dateFrom}-to-${dateTo}`, headers, rows);
  };

  const handlePrint = () => {
    printReport(`Profit and Loss Statement (${dateFrom} to ${dateTo})`, 'pl-report-printable');
  };

  return (
    <div className="space-y-5">
      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Sales Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{currency}{netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Net of discounts & refunds</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Margin</p>
          <p className="text-2xl font-bold text-[#917118] mt-1">{currency}{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{grossMargin}% Gross Margin</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operating Expenses</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{currency}{expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Overhead expenditures</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Operating Profit</p>
          <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currency}{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-[11px] font-medium mt-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {netMargin}% Net Margin
          </p>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex justify-end gap-2 no-print">
        <button
          type="button"
          onClick={fetchPL}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Excel</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span>Print / PDF</span>
        </button>
      </div>

      {/* Structured P&L Table */}
      <div id="pl-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">Profit & Loss Statement (Income Statement)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Accounting Period: {dateFrom} to {dateTo}</p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">Computing Profit & Loss ledger...</div>
        ) : (
          <div className="p-5 space-y-6 text-xs">
            {/* 1. Operating Revenue */}
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2.5">
                1. Operating Revenue
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Gross Sales (Invoiced Orders)</span>
                  <span className="font-mono">{currency}{grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-amber-700 pl-4">
                  <span>Less: Trade & Order Discounts</span>
                  <span className="font-mono">({currency}{discounts.toFixed(2)})</span>
                </div>
                <div className="flex justify-between py-1 text-rose-700 pl-4">
                  <span>Less: Sales Returns & Customer Refunds</span>
                  <span className="font-mono">({currency}{refunds.toFixed(2)})</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Net Sales Revenue</span>
                  <span className="font-mono text-sm">{currency}{netSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 2. Cost of Goods Sold */}
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2.5">
                2. Cost of Goods Sold (COGS)
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Total Direct Product Acquisition Cost</span>
                  <span className="font-mono text-rose-600">({currency}{cogs.toFixed(2)})</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-slate-900 bg-[#FAF5E8] text-[#917118] px-2 rounded">
                  <span>Gross Profit</span>
                  <span className="font-mono text-sm">{currency}{grossProfit.toFixed(2)} ({grossMargin}%)</span>
                </div>
              </div>
            </div>

            {/* 3. Operating Expenses */}
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2.5">
                3. Operating Expenditures (Overheads)
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Total Operating Expenses</span>
                  <span className="font-mono text-rose-600">({currency}{expenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Total Operating Costs</span>
                  <span className="font-mono text-sm">{currency}{expenses.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 4. Net Operating Profit */}
            <div className={`p-4 rounded-xl border ${netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Net Operating Profit / (Loss)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Gross Profit minus Operating Expenses</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {currency}{netProfit.toFixed(2)}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600">{netMargin}% Net Margin</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

