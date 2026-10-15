import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { CATEGORIES } from '../data/seedData';
import { formatINR } from '../utils/storage';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  X,
  Package,
  Layers,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface ProductListViewProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onQuickAdjustStock: (productId: string, delta: number) => void;
  onQuickSellProduct: (product: Product) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  onOpenAddProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickAdjustStock,
  onQuickSellProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'OutOfStock' | 'InStock'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc' | 'priceAsc' | 'priceDesc'>('name');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [viewingSizeProduct, setViewingSizeProduct] = useState<Product | null>(null);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const sizeMatches =
            (item.sizes && item.sizes.some((s) => s.toLowerCase().includes(q))) ||
            (item.size && item.size.toLowerCase().includes(q));

          const matches =
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.color.toLowerCase().includes(q) ||
            sizeMatches;
          if (!matches) return false;
        }

        // Category filter
        if (selectedCategory !== 'All' && item.category !== selectedCategory) {
          return false;
        }

        // Stock status filter
        if (stockFilter === 'Low') {
          return item.quantity <= item.minimumStockLevel && item.quantity > 0;
        }
        if (stockFilter === 'OutOfStock') {
          return item.quantity === 0;
        }
        if (stockFilter === 'InStock') {
          return item.quantity > item.minimumStockLevel;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'stockAsc') {
          return a.quantity - b.quantity;
        }
        if (sortBy === 'stockDesc') {
          return b.quantity - a.quantity;
        }
        if (sortBy === 'priceAsc') {
          return a.sellingPrice - b.sellingPrice;
        }
        if (sortBy === 'priceDesc') {
          return b.sellingPrice - a.sellingPrice;
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  const lowStockCount = products.filter((p) => p.quantity <= p.minimumStockLevel).length;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
            Product Catalog & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Manage your shop products, sizes, colors, purchase prices, and stock counts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, color, size, or category..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-52">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Categories ({products.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({products.filter((p) => p.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="stockAsc">Sort: Quantity (Lowest first)</option>
              <option value="stockDesc">Sort: Quantity (Highest first)</option>
              <option value="priceDesc">Sort: Price (High to Low)</option>
              <option value="priceAsc">Sort: Price (Low to High)</option>
            </select>
          </div>

          {/* Table / Grid Toggle */}
          <div className="hidden sm:flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stock Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/80 text-xs">
          <span className="text-neutral-500 mr-1 text-[11px] uppercase tracking-wider font-semibold">
            Status:
          </span>
          <button
            onClick={() => setStockFilter('All')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              stockFilter === 'All'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setStockFilter('Low')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              stockFilter === 'Low'
                ? 'bg-amber-950 text-amber-300 font-medium border border-amber-800/60'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
          <button
            onClick={() => setStockFilter('OutOfStock')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              stockFilter === 'OutOfStock'
                ? 'bg-red-950 text-red-300 font-medium border border-red-800/60'
                : 'text-red-400/80 hover:text-red-300 hover:bg-red-950/40'
            }`}
          >
            Out of Stock ({products.filter((p) => p.quantity === 0).length})
          </button>
          <button
            onClick={() => setStockFilter('InStock')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              stockFilter === 'InStock'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            Adequate Stock ({products.filter((p) => p.quantity > p.minimumStockLevel).length})
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
        <span>
          Showing <strong className="text-neutral-200 font-mono">{filteredProducts.length}</strong> of{' '}
          <strong className="text-neutral-200 font-mono">{products.length}</strong> products
        </span>
        {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'All') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setStockFilter('All');
            }}
            className="text-amber-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-200">
            {products.length === 0 ? 'No products in inventory yet' : 'No matching products found'}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {products.length === 0
              ? 'Click "Add Product" to add your first menswear item with sizes, pricing, and stock count.'
              : 'Try clearing your search query or selecting a different category filter.'}
          </p>
          <button
            onClick={onOpenAddProduct}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs"
          >
            + Add Product
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* High-Density Table View */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Product Name</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Sizes & Stock</th>
                  <th className="py-3 px-3 font-semibold">Color</th>
                  <th className="py-3 px-3 font-semibold text-right">Purchase Price</th>
                  <th className="py-3 px-3 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-center">Total Stock</th>
                  <th className="py-3 px-3 font-semibold text-center">Min Level</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70 text-neutral-300">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.quantity === 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minimumStockLevel;
                  const sizesList = p.sizes && p.sizes.length > 0
                    ? p.sizes
                    : (p.size ? p.size.split(',').map((s) => s.trim()) : ['M', 'L', 'XL', 'XXL']);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-100 group-hover:text-amber-300 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          {p.sku}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-neutral-300 whitespace-nowrap">
                        {p.category}
                      </td>

                      {/* Sizes with Size-wise Stock counts */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 items-center max-w-[280px]">
                          {sizesList.map((s) => {
                            const sStock = p.sizeQuantities && typeof p.sizeQuantities[s] === 'number'
                              ? p.sizeQuantities[s]
                              : null;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setViewingSizeProduct(p)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700/80 text-xs font-mono hover:border-amber-500 transition-colors cursor-pointer"
                                title={sStock !== null ? `Size ${s}: ${sStock} units in stock. Click to inspect size stock.` : `Size ${s}`}
                              >
                                <span className="text-amber-300 font-bold">{s}</span>
                                {sStock !== null && (
                                  <span className={`text-[10px] font-bold px-1 rounded ${
                                    sStock === 0 ? 'bg-red-500/20 text-red-300' : 'bg-neutral-900 text-neutral-200'
                                  }`}>
                                    {sStock}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setViewingSizeProduct(p)}
                            className="p-1 text-neutral-400 hover:text-amber-400 rounded transition-colors"
                            title="View size-wise stock breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Color */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-neutral-300">
                        {p.color}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                        {formatINR(p.purchasePrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-100 whitespace-nowrap">
                        {formatINR(p.sellingPrice)}
                      </td>

                      {/* Total Stock Quantity with +/- inline buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onQuickAdjustStock(p.id, -1)}
                            disabled={p.quantity <= 0}
                            className="p-1 text-neutral-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
                            title="Deduct 1 unit"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>

                          <div className="min-w-16 text-center">
                            <span
                              className={`text-sm font-bold font-mono tabular-nums ${
                                isOutOfStock
                                  ? 'text-red-400'
                                  : isLowStock
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {p.quantity} pcs
                            </span>
                            <span className="text-[10px] text-neutral-500 block leading-none">
                              {isOutOfStock
                                ? 'Out of Stock'
                                : isLowStock
                                ? 'Low Stock'
                                : 'Total Stock'}
                            </span>
                          </div>

                          <button
                            onClick={() => onQuickAdjustStock(p.id, 1)}
                            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                            title="Add 1 unit"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Minimum Stock Level */}
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                        {p.minimumStockLevel}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onQuickSellProduct(p)}
                            disabled={p.quantity <= 0}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Sell Item"
                          >
                            Sell
                          </button>
                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.quantity === 0;
            const isLowStock = p.quantity > 0 && p.quantity <= p.minimumStockLevel;

            return (
              <div
                key={p.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-neutral-500 font-mono">{p.sku}</span>
                    <span
                      className={`text-[11px] font-semibold font-mono tabular-nums px-2 py-0.5 rounded ${
                        isOutOfStock
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : isLowStock
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {p.quantity} units {isLowStock ? '(Low)' : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-neutral-100 mb-1">
                    {p.name}
                  </h3>

                  <div className="text-xs text-neutral-400 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-300 font-medium">{p.category}</span>
                      <span>·</span>
                      <span>{p.color}</span>
                    </div>

                    {/* Size-wise stock cards/badges */}
                    <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="font-semibold text-neutral-300">Size Stock:</span>
                        <button
                          type="button"
                          onClick={() => setViewingSizeProduct(p)}
                          className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Detail</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(p.sizes && p.sizes.length > 0
                          ? p.sizes
                          : (p.size ? p.size.split(',').map((s) => s.trim()) : ['M', 'L', 'XL', 'XXL'])
                        ).map((s) => {
                          const sStock = p.sizeQuantities && typeof p.sizeQuantities[s] === 'number'
                            ? p.sizeQuantities[s]
                            : null;
                          return (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px]"
                            >
                              <span className="text-amber-300 font-bold">{s}:</span>
                              <span className={sStock === 0 ? 'text-red-400 font-bold' : 'text-neutral-200'}>
                                {sStock !== null ? sStock : '—'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Total Stock: <strong className="text-neutral-200 font-mono">{p.quantity} units</strong></span>
                      <span>Min: {p.minimumStockLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-base font-bold font-mono text-neutral-100">
                        {formatINR(p.sellingPrice)}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Purchase: {formatINR(p.purchasePrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                      <button
                        onClick={() => onQuickAdjustStock(p.id, -1)}
                        disabled={p.quantity <= 0}
                        className="text-neutral-400 hover:text-amber-400 disabled:opacity-30"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-semibold tabular-nums text-neutral-200 px-1">
                        {p.quantity}
                      </span>
                      <button
                        onClick={() => onQuickAdjustStock(p.id, 1)}
                        className="text-neutral-400 hover:text-amber-400"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onQuickSellProduct(p)}
                      disabled={p.quantity <= 0}
                      className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs transition-colors disabled:opacity-30 disabled:pointer-events-none text-center"
                    >
                      Sell Item
                    </button>
                    <button
                      onClick={() => onEditProduct(p)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg border border-neutral-800"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg border border-neutral-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Size-wise Stock Breakdown Modal for Admin */}
      {viewingSizeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">
                    Size-wise Stock Breakdown
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {viewingSizeProduct.name} ({viewingSizeProduct.sku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSizeProduct(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs">
              <div>
                <span className="text-[11px] text-neutral-500 block">Category</span>
                <span className="font-medium text-neutral-200">{viewingSizeProduct.category}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Color</span>
                <span className="font-medium text-neutral-200">{viewingSizeProduct.color}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Selling Price</span>
                <span className="font-mono font-bold text-amber-400">{formatINR(viewingSizeProduct.sellingPrice)}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Total Stock</span>
                <span className="font-mono font-bold text-emerald-400">{viewingSizeProduct.quantity} units</span>
              </div>
            </div>

            {/* Size Table */}
            <div className="rounded-xl border border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-200">
                  {(viewingSizeProduct.sizes && viewingSizeProduct.sizes.length > 0
                    ? viewingSizeProduct.sizes
                    : (viewingSizeProduct.size ? viewingSizeProduct.size.split(',').map((s) => s.trim()) : ['M', 'L', 'XL', 'XXL'])
                  ).map((size) => {
                    const qty = viewingSizeProduct.sizeQuantities && typeof viewingSizeProduct.sizeQuantities[size] === 'number'
                      ? viewingSizeProduct.sizeQuantities[size]
                      : viewingSizeProduct.quantity;
                    const isZero = qty === 0;

                    return (
                      <tr key={size} className="hover:bg-neutral-850/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                          {size}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold tabular-nums">
                          <span className={isZero ? 'text-red-400' : 'text-neutral-100'}>
                            {qty} pcs
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isZero
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : qty <= 5
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isZero ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Stock Summary Formula Banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Total inventory across all sizes:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                Total = {viewingSizeProduct.quantity} units
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewingSizeProduct(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = viewingSizeProduct;
                  setViewingSizeProduct(null);
                  onEditProduct(p);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Product / Quantities</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
