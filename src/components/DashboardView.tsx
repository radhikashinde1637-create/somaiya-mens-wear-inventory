import React from 'react';
import { Product, Sale } from '../types';
import { formatINR, formatDateTime } from '../utils/storage';
import {
  Package,
  Layers,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  Tag,
  Eye,
  CheckCircle2,
  PackagePlus,
  Download,
  Upload,
  Database,
  Shield,
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  onNavigateTab: (tab: 'products' | 'stock' | 'sales' | 'reports') => void;
  onOpenNewSale: () => void;
  onOpenAddProduct: () => void;
  onQuickRestock: (productId: string, amount: number) => void;
  onViewSaleReceipt: (sale: Sale) => void;
  onOpenBackupRestore?: (mode?: 'download' | 'restore') => void;
  onTriggerRestoreBackup?: () => void;
  onTriggerDownloadBackup?: () => void;
  onFileSelectedForRestore?: (file: File) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  onNavigateTab,
  onOpenNewSale,
  onOpenAddProduct,
  onQuickRestock,
  onViewSaleReceipt,
  onOpenBackupRestore,
  onTriggerRestoreBackup,
  onTriggerDownloadBackup,
  onFileSelectedForRestore,
}) => {
  // Calculations
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantity, 0);

  const inventoryRetailValue = products.reduce(
    (acc, p) => acc + p.quantity * p.sellingPrice,
    0
  );
  const inventoryCostValue = products.reduce(
    (acc, p) => acc + p.quantity * p.purchasePrice,
    0
  );

  const lowStockProducts = products.filter((p) => p.quantity <= p.minimumStockLevel);

  // Sales Today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date.startsWith(todayDateStr));
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Total Sales & Revenue
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Category summary
  const categoryStats = products.reduce<Record<string, { count: number; units: number; value: number }>>(
    (acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = { count: 0, units: 0, value: 0 };
      }
      acc[p.category].count += 1;
      acc[p.category].units += p.quantity;
      acc[p.category].value += p.quantity * p.sellingPrice;
      return acc;
    },
    {}
  );

  const sortedCategories = Object.entries(categoryStats).sort(
    (a, b) => b[1].units - a[1].units
  );

  // Recent 5 sales
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Store Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time stock levels, live sales counters, and inventory health for Somaiya Men's Wear.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => onOpenBackupRestore?.('download')}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 hover:border-amber-500/40 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            title="Download or Restore Store Data Backup"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Backup & Restore</span>
            <span className="sm:hidden">Backup</span>
          </button>
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>New Sale Bill</span>
          </button>
          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Products */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Catalog Products</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-100 font-mono tabular-nums">
            {totalProducts}
          </p>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span>In Inventory</span>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
            >
              <span>View list</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 2: Total Units In Stock */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Total Quantity</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-100 font-mono tabular-nums">
            {totalStockUnits}
          </p>
          <div className="mt-2 text-xs text-neutral-500">
            Total units across all garments
          </div>
        </div>

        {/* KPI 3: Stock Valuation */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Stock Retail Value</span>
            <Tag className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums">
            {formatINR(inventoryRetailValue)}
          </p>
          <div className="mt-2 text-xs text-neutral-500 font-mono tabular-nums">
            Purchase Value: {formatINR(inventoryCostValue)}
          </div>
        </div>

        {/* KPI 4: Sales Revenue */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {formatINR(todayRevenue)}
          </p>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span className="font-mono tabular-nums">{todaySales.length} bills today</span>
            <span className="font-mono tabular-nums">Total: {formatINR(totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-neutral-200">
                  Low Stock Products Alert ({lowStockProducts.length} items)
                </h2>
                <p className="text-xs text-amber-300/80">
                  Products currently at or below their Minimum Stock Level. Replenish to prevent stockouts.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('stock')}
              className="text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 self-start sm:self-auto bg-amber-900/40 hover:bg-amber-900/60 px-3 py-1.5 rounded-lg border border-amber-800/60 transition-colors"
            >
              <span>Manage In Stock Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lowStockProducts.map((item) => {
              const isOut = item.quantity === 0;
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs text-neutral-400 font-mono">{item.sku}</span>
                      <span
                        className={`text-[11px] font-semibold font-mono tabular-nums px-2 py-0.5 rounded ${
                          isOut
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isOut ? 'OUT OF STOCK' : `${item.quantity} units (Min: ${item.minimumStockLevel})`}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-neutral-200 line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="text-xs text-neutral-400 mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.color}</span>
                        <span>·</span>
                        <span className="font-semibold text-neutral-300 font-mono">Total: {item.quantity} pcs</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(item.sizes && item.sizes.length > 0 ? item.sizes : (item.size ? item.size.split(',') : ['M', 'L', 'XL', 'XXL'])).map((s) => {
                          const sTrim = s.trim();
                          const qty = item.sizeQuantities && typeof item.sizeQuantities[sTrim] === 'number' ? item.sizeQuantities[sTrim] : null;
                          return (
                            <span key={sTrim} className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono inline-flex items-center gap-1">
                              <span className="text-amber-400 font-bold">{sTrim}:</span>
                              <span className={qty === 0 ? 'text-red-400 font-bold' : 'text-neutral-200'}>
                                {qty !== null ? qty : '—'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-mono font-medium">
                      Selling: {formatINR(item.sellingPrice)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onQuickRestock(item.id, 5)}
                        className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded transition-colors"
                        title="Add 5 units"
                      >
                        +5 units
                      </button>
                      <button
                        onClick={() => onQuickRestock(item.id, 10)}
                        className="px-2.5 py-1 text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/40 rounded transition-colors"
                        title="Add 10 units"
                      >
                        +10 units
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products & Size-Wise Stock Overview */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-neutral-200">
                Product Stock by Size ({products.length} products)
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live size-wise quantity breakdown and total inventory across all garments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Manage in Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No products entered in inventory yet.{' '}
            <button onClick={onOpenAddProduct} className="text-amber-400 hover:underline ml-1">
              Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product Name & SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Size-wise Stock Breakdown</th>
                  <th className="py-2.5 px-3 text-center">Total Stock</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {products.slice(0, 8).map((p) => {
                  const sizesList = p.sizes && p.sizes.length > 0
                    ? p.sizes
                    : (p.size ? p.size.split(',').map((s) => s.trim()) : ['M', 'L', 'XL', 'XXL']);

                  const isOut = p.quantity === 0;
                  const isLow = p.quantity > 0 && p.quantity <= p.minimumStockLevel;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-850/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-100">{p.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{p.sku} · {p.color}</div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">
                        {p.category}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {sizesList.map((sz) => {
                            const szQty = p.sizeQuantities && typeof p.sizeQuantities[sz] === 'number'
                              ? p.sizeQuantities[sz]
                              : null;
                            return (
                              <span
                                key={sz}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px]"
                                title={szQty !== null ? `Size ${sz}: ${szQty} in stock` : `Size ${sz}`}
                              >
                                <span className="text-amber-300 font-bold">{sz}:</span>
                                <span className={szQty === 0 ? 'text-red-400 font-bold' : 'text-neutral-200'}>
                                  {szQty !== null ? `${szQty} pcs` : '—'}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            isOut
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {p.quantity} pcs
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-100 whitespace-nowrap">
                        {formatINR(p.sellingPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={onOpenNewSale}
                          disabled={p.quantity <= 0}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          New Sale
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dual Column: Category Distribution & Recent Sales Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category Breakdown (1 col) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-200">Category Breakdown</h2>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-amber-400 hover:underline"
            >
              Catalog
            </button>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No products entered yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {sortedCategories.map(([category, stats]) => {
                const percentage = totalStockUnits > 0 ? (stats.units / totalStockUnits) * 100 : 0;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-300">{category}</span>
                      <div className="text-right text-neutral-400 font-mono tabular-nums">
                        <span>{stats.units} units</span>
                        <span className="text-neutral-600 mx-1">·</span>
                        <span className="text-neutral-500">{formatINR(stats.value)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Sales (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <div>
                <h2 className="text-sm font-semibold text-neutral-200">Recent Sales Bills</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Latest customer billing transactions
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('sales')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>All Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 space-y-2">
                <Receipt className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">No sales bills created yet.</p>
                <button
                  onClick={onOpenNewSale}
                  className="px-3 py-1.5 text-xs bg-amber-500 text-neutral-950 font-semibold rounded-lg hover:bg-amber-400"
                >
                  Create First Bill
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-neutral-400 border-b border-neutral-800/80">
                      <th className="pb-2.5 font-medium">Invoice #</th>
                      <th className="pb-2.5 font-medium">Date & Time</th>
                      <th className="pb-2.5 font-medium">Customer</th>
                      <th className="pb-2.5 font-medium">Payment</th>
                      <th className="pb-2.5 font-medium text-right">Items</th>
                      <th className="pb-2.5 font-medium text-right">Amount</th>
                      <th className="pb-2.5 font-medium text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 font-mono text-neutral-200 font-medium">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-2.5 text-neutral-400">
                          {formatDateTime(sale.date)}
                        </td>
                        <td className="py-2.5">
                          <span className="text-neutral-200 font-medium">
                            {sale.customerName || 'Walk-in Customer'}
                          </span>
                        </td>
                        <td className="py-2.5 text-neutral-400">
                          {sale.paymentMethod}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-neutral-400">
                          {sale.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-amber-400">
                          {formatINR(sale.totalAmount)}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => onViewSaleReceipt(sale)}
                            className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                            title="View / Print Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>Automated inventory reduction active</span>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              View Sales & Profit Report →
            </button>
          </div>
        </div>
      </div>

      {/* Admin Section: Data Management, Backup & Restore */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-100">
                  Admin Data Center · Backup & Restore
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                  Safe Storage
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
                Safeguard all store inventory data. Downloads directly into your computer's Downloads folder without opening in Visual Studio Code or any external application.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onTriggerDownloadBackup || (() => onOpenBackupRestore?.('download'))}
              title="Download full backup directly to your device (Does not open in VS Code)"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup</span>
            </button>
            <label
              title="Select and restore a previously saved JSON or .bak backup file"
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 hover:border-neutral-600 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none relative"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Restore Backup</span>
              <input
                type="file"
                accept=".json,.bak,application/json,application/octet-stream,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';
                  onFileSelectedForRestore?.(file);
                }}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
                aria-label="Restore Backup file selector"
              />
            </label>
            <button
              onClick={() => onOpenBackupRestore?.('download')}
              title="Open full Backup & Restore Data Center Suite (Copy, .bak safe archive, In-App Preview & Browser Vault)"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-750 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Data Suite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
