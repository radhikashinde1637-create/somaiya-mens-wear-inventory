import React, { useState } from 'react';
import { Product, StockLog } from '../types';
import { formatDateTime } from '../utils/storage';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Package,
  ClipboardList,
  Sparkles,
  Camera,
  Search,
} from 'lucide-react';

interface StockManagementViewProps {
  products: Product[];
  stockLogs: StockLog[];
  onAdjustStock: (
    productId: string,
    quantityChange: number,
    type: 'IN' | 'OUT' | 'ADJUST',
    reason: string,
    size?: string
  ) => void;
  onBatchRestock: (productIds: string[], amountPerItem: number) => void;
  onNavigateToProducts: () => void;
  onOpenBarcodeScanner?: () => void;
  highlightedProductId?: string | null;
}

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  products,
  stockLogs,
  onAdjustStock,
  onBatchRestock,
  onNavigateToProducts,
  onOpenBarcodeScanner,
  highlightedProductId,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    highlightedProductId || products[0]?.id || ''
  );
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [quantityInput, setQuantityInput] = useState<number | ''>(5);
  const [reasonInput, setReasonInput] = useState<string>('New stock arrival from supplier');
  const [successMessage, setSuccessMessage] = useState<string>('');

  React.useEffect(() => {
    if (highlightedProductId) {
      setSelectedProductId(highlightedProductId);
      setSelectedSize('All');
    }
  }, [highlightedProductId]);

  const lowStockItems = products.filter((p) => p.quantity <= p.minimumStockLevel);
  const selectedProduct = products.find((p) => p.id === (selectedProductId || products[0]?.id));

  const handleSearchStock = (query: string) => {
    setStockSearchQuery(query);
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === q) ||
        p.sku.toLowerCase() === q ||
        p.name.toLowerCase().includes(q) ||
        p.id === q
    );
    if (found) {
      setSelectedProductId(found.id);
      setSelectedSize('All');
    }
  };

  const handleQuickAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = selectedProduct;
    if (!targetProd || quantityInput === '' || Number(quantityInput) <= 0) {
      return;
    }

    const qty = Number(quantityInput);
    let delta = qty;
    if (adjustType === 'OUT') {
      delta = -qty;
    } else if (adjustType === 'ADJUST') {
      const currentQty = selectedSize !== 'All' && targetProd.sizeQuantities && typeof targetProd.sizeQuantities[selectedSize] === 'number'
        ? targetProd.sizeQuantities[selectedSize]
        : targetProd.quantity;
      delta = qty - currentQty;
    }

    const sizeParam = selectedSize !== 'All' ? selectedSize : undefined;
    onAdjustStock(
      targetProd.id,
      delta,
      adjustType,
      reasonInput.trim() || `Manual ${adjustType} stock update`,
      sizeParam
    );

    setSuccessMessage(
      `Stock updated for ${targetProd.name}${sizeParam ? ` [Size: ${sizeParam}]` : ''}: ${delta > 0 ? `+${delta}` : delta} units.`
    );
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleBatchRestockAll = () => {
    if (lowStockItems.length === 0) return;
    const ids = lowStockItems.map((p) => p.id);
    onBatchRestock(ids, 10);
    setSuccessMessage(`Replenished +10 units to all ${lowStockItems.length} low stock items!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const recentLogs = [...stockLogs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header with Search and Scan Button */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Add stock from deliveries, write off damaged pieces, and monitor inventory movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Product / Barcode Input */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={stockSearchQuery}
              onChange={(e) => handleSearchStock(e.target.value)}
              placeholder="Search product / barcode..."
              className="w-full pl-8 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Barcode Scanner Button */}
          {onOpenBarcodeScanner && (
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              title="Open camera barcode scanner"
            >
              <Camera className="w-4 h-4" />
              <span>Scan</span>
            </button>
          )}

          {lowStockItems.length > 0 && (
            <button
              onClick={handleBatchRestockAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Restock Low (+10)</span>
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-200">No products in inventory yet</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Please add products to your catalog first before adjusting stock levels.
          </p>
          <button
            onClick={onNavigateToProducts}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs"
          >
            + Add Products Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Quick Stock Adjust Form (5 cols) */}
          <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-800">
              <Layers className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-neutral-200">
                Direct Stock In / Out
              </h2>
            </div>

            <form onSubmit={handleQuickAdjustSubmit} className="space-y-4 text-xs">
              {/* Select Product */}
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Select Product *
                </label>
                <select
                  value={selectedProductId || products[0]?.id}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedSize('All');
                  }}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  {products.map((p) => {
                    const sizeLabel =
                      p.sizes && p.sizes.length > 0
                        ? p.sizes.join(', ')
                        : p.size || 'M, L, XL, XXL';
                    return (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (Sizes: {sizeLabel}, {p.color}) — {p.quantity} total units
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Current Product Info & Size-wise Breakdown */}
              {selectedProduct && (
                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Total Stock:</span>
                      <span className="text-base font-bold font-mono text-neutral-100">
                        {selectedProduct.quantity} units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Minimum Alert Level:</span>
                      <span className="text-xs font-mono text-neutral-300">
                        ≤ {selectedProduct.minimumStockLevel} units
                      </span>
                    </div>
                  </div>

                  {/* Size-wise Stock Breakdown Pills */}
                  <div className="pt-2 border-t border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase tracking-wider">
                      Current Size-wise Stock:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(selectedProduct.sizes && selectedProduct.sizes.length > 0
                        ? selectedProduct.sizes
                        : (selectedProduct.size ? selectedProduct.size.split(',') : ['M', 'L', 'XL', 'XXL'])
                      ).map((s) => {
                        const sTrim = s.trim();
                        const q = selectedProduct.sizeQuantities && typeof selectedProduct.sizeQuantities[sTrim] === 'number'
                          ? selectedProduct.sizeQuantities[sTrim]
                          : null;
                        return (
                          <span
                            key={sTrim}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px]"
                          >
                            <span className="text-amber-300 font-bold">{sTrim}:</span>
                            <span className={q === 0 ? 'text-red-400 font-bold' : 'text-neutral-200'}>
                              {q !== null ? `${q} pcs` : '—'}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Target Size Selection */}
              {selectedProduct && (
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    Apply to Specific Size:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSize('All')}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        selectedSize === 'All'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      All Sizes
                    </button>
                    {(selectedProduct.sizes && selectedProduct.sizes.length > 0
                      ? selectedProduct.sizes
                      : (selectedProduct.size ? selectedProduct.size.split(',') : ['M', 'L', 'XL', 'XXL'])
                    ).map((s) => {
                      const sTrim = s.trim();
                      const szQty = selectedProduct.sizeQuantities && typeof selectedProduct.sizeQuantities[sTrim] === 'number'
                        ? selectedProduct.sizeQuantities[sTrim]
                        : null;
                      return (
                        <button
                          key={sTrim}
                          type="button"
                          onClick={() => setSelectedSize(sTrim)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                            selectedSize === sTrim
                              ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-neutral-100 hover:border-neutral-700'
                          }`}
                        >
                          {sTrim} {szQty !== null ? `(${szQty})` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Operation Type */}
              <div>
                <label className="block font-medium text-neutral-300 mb-1.5">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('IN');
                      setReasonInput('New stock arrival from supplier');
                    }}
                    className={`py-2 px-2 text-center rounded-lg border font-medium transition-colors flex flex-col items-center gap-1 ${
                      adjustType === 'IN'
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Add Stock (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('OUT');
                      setReasonInput('Damaged / Defective piece removed');
                    }}
                    className={`py-2 px-2 text-center rounded-lg border font-medium transition-colors flex flex-col items-center gap-1 ${
                      adjustType === 'OUT'
                        ? 'bg-red-950/80 border-red-700 text-red-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Reduce Stock (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('ADJUST');
                      setReasonInput('Physical inventory count audit');
                    }}
                    className={`py-2 px-2 text-center rounded-lg border font-medium transition-colors flex flex-col items-center gap-1 ${
                      adjustType === 'ADJUST'
                        ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Set Exact (=)</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  {adjustType === 'ADJUST' ? 'Exact New Total Quantity' : 'Units to Add / Deduct'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10"
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantityInput(5)}
                      className="px-2 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded text-neutral-300 text-[11px]"
                    >
                      5
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantityInput(10)}
                      className="px-2 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded text-neutral-300 text-[11px]"
                    >
                      10
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantityInput(25)}
                      className="px-2 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded text-neutral-300 text-[11px]"
                    >
                      25
                    </button>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Reason / Reference
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Supplier invoice delivery, audit check"
                  required
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
              >
                Apply Stock Update
              </button>
            </form>
          </div>

          {/* Right: Low Stock Priority Table (7 cols) */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Low Stock Products ({lowStockItems.length})
                  </h2>
                </div>
                <span className="text-xs text-neutral-500">
                  Below Minimum Level
                </span>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-neutral-300">All products have sufficient stock</p>
                  <p className="text-xs mt-1">No items currently below their Minimum Stock Level.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-neutral-400 border-b border-neutral-800">
                        <th className="pb-2.5 font-medium">Product</th>
                        <th className="pb-2.5 font-medium text-center">In Stock</th>
                        <th className="pb-2.5 font-medium text-center">Min Level</th>
                        <th className="pb-2.5 font-medium text-right">Quick Restock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                      {lowStockItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-800/30">
                          <td className="py-2.5">
                            <div className="font-medium text-neutral-200 line-clamp-1">{item.name}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              {item.sku} · Sizes: {item.sizes && item.sizes.length > 0 ? item.sizes.join(', ') : (item.size || 'M, L, XL, XXL')} · {item.color}
                            </div>
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold tabular-nums">
                            <span
                              className={item.quantity === 0 ? 'text-red-400' : 'text-amber-400'}
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-mono text-neutral-400">
                            {item.minimumStockLevel}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() =>
                                  onAdjustStock(
                                    item.id,
                                    5,
                                    'IN',
                                    'Quick restock from Low Stock table'
                                  )
                                }
                                className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded"
                              >
                                +5
                              </button>
                              <button
                                onClick={() =>
                                  onAdjustStock(
                                    item.id,
                                    10,
                                    'IN',
                                    'Quick restock from Low Stock table'
                                  )
                                }
                                className="px-2 py-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-medium"
                              >
                                +10
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500">
              Adding stock immediately synchronizes across the catalog and sales register.
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Audit Log */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Stock Movement History
            </h2>
          </div>
          <span className="text-xs text-neutral-500">
            Automated log
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No stock adjustments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="pb-2.5 font-medium">Timestamp</th>
                  <th className="pb-2.5 font-medium">Product Name</th>
                  <th className="pb-2.5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium text-center">Change</th>
                  <th className="pb-2.5 font-medium text-center">New Balance</th>
                  <th className="pb-2.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {recentLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-neutral-800/30">
                      <td className="py-2.5 text-neutral-400 whitespace-nowrap">
                        {formatDateTime(log.date)}
                      </td>
                      <td className="py-2.5 text-neutral-200 font-medium">
                        {log.productName}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.type === 'IN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : log.type === 'SALE'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : log.type === 'OUT'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono font-bold tabular-nums">
                        <span
                          className={
                            log.quantityChanged > 0
                              ? 'text-emerald-400'
                              : log.quantityChanged < 0
                              ? 'text-red-400'
                              : 'text-neutral-400'
                          }
                        >
                          {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono tabular-nums text-neutral-300">
                        {log.newQuantity}
                      </td>
                      <td className="py-2.5 text-neutral-300 max-w-xs truncate">
                        {log.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
