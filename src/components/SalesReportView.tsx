import React, { useState, useMemo } from 'react';
import { Sale, Product } from '../types';
import { formatINR, formatDate } from '../utils/storage';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Award,
  Wallet,
  Tag,
  CreditCard,
} from 'lucide-react';

interface SalesReportViewProps {
  sales: Sale[];
  products: Product[];
}

export const SalesReportView: React.FC<SalesReportViewProps> = ({
  sales,
  products,
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Filter sales by selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((sale) => {
      if (period === 'all') return true;

      const saleDate = new Date(sale.date);
      if (period === 'today') {
        return sale.date.startsWith(now.toISOString().split('T')[0]);
      }
      if (period === 'week') {
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (period === 'month') {
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [sales, period]);

  // Calculations
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalTransactions = filteredSales.length;

  // Calculate Profit = Revenue - Total Purchase Price (Cost of goods sold)
  const { totalUnitsSold, totalPurchaseCost } = useMemo(() => {
    let units = 0;
    let purchaseCost = 0;
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        units += item.quantity;
        purchaseCost += item.purchasePrice * item.quantity;
      });
    });
    return { totalUnitsSold: units, totalPurchaseCost: purchaseCost };
  }, [filteredSales]);

  const grossProfit = totalRevenue - totalPurchaseCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Top Selling Items
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; units: number; revenue: number }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            units: 0,
            revenue: 0,
          };
        }
        map[item.productId].units += item.quantity;
        map[item.productId].revenue += item.subtotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredSales]);

  // Sales by Category
  const categorySales = useMemo(() => {
    const map: Record<string, { units: number; revenue: number }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = item.category || 'Apparel';
        if (!map[cat]) {
          map[cat] = { units: 0, revenue: 0 };
        }
        map[cat].units += item.quantity;
        map[cat].revenue += item.subtotal;
      });
    });

    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filteredSales]);

  // Payment Method Breakdown (Cash, UPI, Card)
  const paymentMethodStats = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {
      Cash: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      Card: { count: 0, total: 0 },
    };
    filteredSales.forEach((sale) => {
      if (!map[sale.paymentMethod]) {
        map[sale.paymentMethod] = { count: 0, total: 0 };
      }
      map[sale.paymentMethod].count += 1;
      map[sale.paymentMethod].total += sale.totalAmount;
    });
    return Object.entries(map);
  }, [filteredSales]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Mobile Number',
      'Items Purchased',
      'Subtotal (INR)',
      'Discount (INR)',
      'Total Amount (INR)',
      'Payment Mode',
    ];

    const rows = filteredSales.map((sale) => {
      const itemsList = sale.items
        .map((i) => `${i.productName} (${i.size}, ${i.color}) x${i.quantity}`)
        .join('; ');

      return [
        `"${sale.invoiceNumber}"`,
        `"${formatDate(sale.date)}"`,
        `"${sale.customerName || 'Walk-in'}"`,
        `"${sale.customerPhone || ''}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
        sale.subtotal,
        sale.discount,
        sale.totalAmount,
        `"${sale.paymentMethod}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Somaiya_Menswear_Sales_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Sales & Profit Reports
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Analyze daily and monthly revenue, net profit margins, and bestselling garments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
            {(
              [
                { id: 'today', label: 'Daily (Today)' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'Monthly (30 Days)' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  period === p.id
                    ? 'bg-neutral-800 text-amber-400 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Sales Revenue</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-100 font-mono tabular-nums">
            {formatINR(totalRevenue)}
          </p>
          <div className="mt-2 text-xs text-neutral-500">
            Across <strong className="text-neutral-300 font-mono">{totalTransactions}</strong> customer bills
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Calculated Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums">
            {formatINR(grossProfit)}
          </p>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span>Profit Margin:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Total Garments Sold */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Quantity Sold</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-100 font-mono tabular-nums">
            {totalUnitsSold} <span className="text-sm font-normal text-neutral-400">units</span>
          </p>
          <div className="mt-2 text-xs text-neutral-500">
            Purchase Cost: <span className="font-mono">{formatINR(totalPurchaseCost)}</span>
          </div>
        </div>

        {/* Card 4: Average Bill Size */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Average Bill Value</span>
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-100 font-mono tabular-nums">
            {formatINR(averageOrderValue)}
          </p>
          <div className="mt-2 text-xs text-neutral-500">
            Per transaction average
          </div>
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center text-neutral-500">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-neutral-300">No sales transactions in the selected period.</p>
          <p className="text-xs mt-1">Once you record sales bills, comprehensive profit charts and analytics will display here.</p>
        </div>
      ) : (
        <>
          {/* Grid: Top Sellers & Category Share */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Top Selling Items */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Top Selling Products
                  </h2>
                </div>
                <span className="text-xs text-neutral-500">By quantity sold</span>
              </div>

              <div className="space-y-3">
                {topProducts.map((prod, index) => (
                  <div
                    key={prod.name}
                    className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center font-mono font-bold text-neutral-300 text-xs">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-neutral-200 line-clamp-1">{prod.name}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-amber-400">
                        {formatINR(prod.revenue)}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {prod.units} units sold
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Revenue by Category */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Category Revenue Share
                  </h2>
                </div>
                <span className="text-xs text-neutral-500">Department distribution</span>
              </div>

              <div className="space-y-3.5">
                {categorySales.map(([cat, stats]) => {
                  const percentage = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-300">{cat}</span>
                        <div className="text-right font-mono tabular-nums">
                          <span className="text-neutral-100 font-semibold">{formatINR(stats.revenue)}</span>
                          <span className="text-neutral-500 ml-2">({stats.units} units · {percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Payment Mode Distribution (Cash, UPI, Card)
                </h2>
              </div>
              <span className="text-xs text-neutral-500">Collected funds</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethodStats.map(([method, stats]) => (
                <div
                  key={method}
                  className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-xs"
                >
                  <span className="text-neutral-400 block font-medium">{method}</span>
                  <span className="text-lg font-bold font-mono text-neutral-100 block mt-1">
                    {formatINR(stats.total)}
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5 font-mono">
                    {stats.count} bills
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
