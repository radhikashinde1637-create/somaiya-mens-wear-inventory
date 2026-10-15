import React, { useState, useMemo, useEffect } from 'react';
import { Product, Sale, SaleItem, PaymentMethod, Customer, Bill } from '../types';
import { formatINR, formatDateTime, getProductSizesList, getProductSizeStock } from '../utils/storage';
import {
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  QrCode,
  Banknote,
  Eye,
  AlertCircle,
  ShoppingBag,
  PackagePlus,
  Sparkles,
  User as UserIcon,
  Phone,
  Tag,
  CheckCircle2,
  Camera,
} from 'lucide-react';

interface SalesManagementViewProps {
  products: Product[];
  sales: Sale[];
  customers?: Customer[];
  bills?: Bill[];
  onRecordSale: (newSale: Omit<Sale, 'id' | 'invoiceNumber'>) => Sale;
  onViewReceipt: (sale: Sale) => void;
  onNavigateToProducts: () => void;
  initialSelectedProduct?: Product | null;
  onClearInitialProduct?: () => void;
  onOpenBarcodeScanner?: () => void;
}

export const SalesManagementView: React.FC<SalesManagementViewProps> = ({
  products,
  sales,
  customers,
  bills,
  onRecordSale,
  onViewReceipt,
  onNavigateToProducts,
  initialSelectedProduct,
  onClearInitialProduct,
  onOpenBarcodeScanner,
}) => {
  // POS Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  // Active Item Key: `${productId}-${size}`
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

  // Filters & Customer Details
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Filters
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Handle initialSelectedProduct prop (e.g. when clicking "Sell" in Catalog)
  useEffect(() => {
    if (initialSelectedProduct && initialSelectedProduct.quantity > 0) {
      const sizes = getProductSizesList(initialSelectedProduct);
      const chosenSize = sizes[0] || 'No Size';
      handleSelectProductAndSize(initialSelectedProduct, chosenSize);
      if (onClearInitialProduct) onClearInitialProduct();
    }
  }, [initialSelectedProduct]);

  // Categories list for filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Searchable In-Stock Products
  const searchableProducts = useMemo(() => {
    const inStock = products.filter((p) => p.quantity > 0);
    return inStock.filter((p) => {
      if (selectedCategoryFilter !== 'All' && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase();
      const sizesStr = getProductSizesList(p).join(' ').toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        sizesStr.includes(q)
      );
    });
  }, [products, productSearch, selectedCategoryFilter]);

  // Select exact product and size
  const handleSelectProductAndSize = (product: Product, sizeToSelect: string) => {
    if (product.quantity <= 0) {
      setErrorMsg(`"${product.name}" is currently out of stock.`);
      return;
    }

    const sizeStock = getProductSizeStock(product, sizeToSelect);
    if (product.sizeQuantities && sizeStock <= 0) {
      setErrorMsg(`Size "${sizeToSelect}" of "${product.name}" is currently out of stock (0 available).`);
      return;
    }

    const itemKey = `${product.id}-${sizeToSelect}`;
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.size === sizeToSelect
    );

    if (existingIndex >= 0) {
      // Already in cart - select and focus it
      setActiveItemKey(itemKey);
      setErrorMsg('');
      setSuccessMsg(`Selected ${product.name} (Size: ${sizeToSelect})`);
      setTimeout(() => setSuccessMsg(''), 2500);
      return;
    }

    // Check size stock already in cart
    const sizeCurrentlyInCart = cart
      .filter((item) => item.productId === product.id && item.size === sizeToSelect)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (product.sizeQuantities && sizeCurrentlyInCart >= sizeStock) {
      setErrorMsg(
        `Cannot add more: All ${sizeStock} units of Size "${sizeToSelect}" for "${product.name}" are already in this bill.`
      );
      return;
    }

    // Check combined stock across all sizes of this product already in cart
    const totalCurrentlyInCart = cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (totalCurrentlyInCart >= product.quantity) {
      setErrorMsg(
        `Cannot add size ${sizeToSelect}. Total available stock for "${product.name}" is ${product.quantity} units, which are already allocated in this bill.`
      );
      return;
    }

    // Add item with initial quantity 1
    const newItem: SaleItem = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      size: sizeToSelect,
      color: product.color,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      quantity: 1,
      subtotal: product.sellingPrice,
    };

    setCart((prev) => [...prev, newItem]);
    setActiveItemKey(itemKey);
    setErrorMsg('');
    setSuccessMsg(`Added ${product.name} (Size: ${sizeToSelect}) to bill`);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Update quantity for a specific product and size
  const handleUpdateItemQuantity = (productId: string, size: string, requestedQty: number) => {
    const product = products.find(
      (p) => String(p.id) === String(productId) || (p.name && cart.find((c) => c.productId === productId)?.productName === p.name)
    );
    if (!product) return;

    if (isNaN(requestedQty) || requestedQty < 1) {
      requestedQty = 1;
    }

    const availableSizeStock = getProductSizeStock(product, size);
    let maxAllowed = availableSizeStock;
    if (maxAllowed < 1) maxAllowed = 1;

    let finalQty = Math.floor(requestedQty);
    if (finalQty > maxAllowed) {
      finalQty = maxAllowed;
      setErrorMsg(
        `Stock limit: Only ${availableSizeStock} units available for Size "${size}" of "${product.name}". Adjusted to maximum available (${maxAllowed} units).`
      );
    } else {
      setErrorMsg('');
    }

    setCart((prev) =>
      prev.map((item) =>
        String(item.productId) === String(productId) && item.size === size
          ? {
              ...item,
              quantity: finalQty,
              subtotal: finalQty * Number(item.sellingPrice),
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) =>
      prev.filter((item) => !(String(item.productId) === String(productId) && item.size === size))
    );
    if (activeItemKey === `${productId}-${size}`) {
      setActiveItemKey(null);
    }
  };

  const clearCart = () => {
    setCart([]);
    setActiveItemKey(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (onClearInitialProduct) onClearInitialProduct();
  };

  // Active item in the selected panel
  const activeCartItem =
    cart.find((item) => `${item.productId}-${item.size}` === activeItemKey) ||
    (cart.length > 0 ? cart[cart.length - 1] : null);

  const activeProduct = activeCartItem
    ? products.find((p) => String(p.id) === String(activeCartItem.productId)) || null
    : null;

  // Pricing Totals
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUnitsInBill = cart.reduce((sum, item) => sum + item.quantity, 0);
  const discountVal = discount === '' ? 0 : Number(discount);
  const cartTotal = Math.max(0, cartSubtotal - discountVal);

  // Checkout submission
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (cart.length === 0) {
      setErrorMsg('Please select at least one product size to create a bill.');
      return;
    }

    // Verify each item has positive quantity
    if (cart.some((item) => Number(item.quantity) <= 0)) {
      setErrorMsg('Each item in the bill must have a valid quantity of at least 1.');
      return;
    }

    // Verify size-wise stock availability across all items in cart
    for (const item of cart) {
      const prod = products.find((p) => String(p.id) === String(item.productId));
      if (prod) {
        const sizeStock = getProductSizeStock(prod, item.size);
        if (Number(item.quantity) > sizeStock) {
          setErrorMsg(
            `Cannot complete sale: Requested ${item.quantity} units for Size "${item.size}" of "${prod.name}", but only ${sizeStock} units are available in inventory.`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Record sale & automatically reduce stock
      const createdSale = onRecordSale({
        date: new Date().toISOString(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart,
        subtotal: cartSubtotal,
        discount: discountVal,
        totalAmount: cartTotal,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      // Reset POS cart & form
      setCart([]);
      setActiveItemKey(null);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setNotes('');
      setErrorMsg('');
      setSuccessMsg('');
      if (onClearInitialProduct) onClearInitialProduct();

      // Show printable receipt modal
      onViewReceipt(createdSale);
    } catch (err) {
      console.error('Error recording sale:', err);
      setErrorMsg('Failed to process sale. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered sales ledger
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (historyPeriod === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!s.date.startsWith(todayStr)) return false;
      } else if (historyPeriod === 'week') {
        const saleDate = new Date(s.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (historyPeriod === 'month') {
        const saleDate = new Date(s.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesInvoice = s.invoiceNumber.toLowerCase().includes(q);
        const matchesCustomer = s.customerName?.toLowerCase().includes(q);
        const matchesPhone = s.customerPhone?.toLowerCase().includes(q);
        if (!matchesInvoice && !matchesCustomer && !matchesPhone) return false;
      }

      return true;
    });
  }, [sales, historyPeriod, historySearch]);

  const historyTotalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-500" />
            <span>New Sale & POS Billing Counter</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Click product sizes to select items, adjust quantities, capture customer details, and generate bills with automatic inventory reduction.
          </p>
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
            <span className="text-xs text-neutral-400">Current Bill:</span>
            <span className="text-sm font-mono font-bold text-amber-400">
              {formatINR(cartTotal)}
            </span>
            <span className="text-[11px] text-neutral-500">({totalUnitsInBill} units)</span>
          </div>
        )}
      </div>

      {/* POS Billing Counter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Catalog & Size Buttons (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-neutral-200">
                1. Select Product & Size
              </h2>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              {searchableProducts.length} in stock
            </span>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-3">
              <PackagePlus className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-xs">No products in inventory yet.</p>
              <button
                type="button"
                onClick={onNavigateToProducts}
                className="px-3 py-1.5 bg-amber-500 text-neutral-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                + Add Products First
              </button>
            </div>
          ) : (
            <>
              {/* Product search & Category filter */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search by name, SKU, barcode, size..."
                      className="w-full pl-8 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {onOpenBarcodeScanner && (
                    <button
                      type="button"
                      onClick={onOpenBarcodeScanner}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
                      title="Scan product barcode to add to cart"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Scan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold shrink-0">
                    Filter:
                  </span>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[11px] shrink-0 transition-colors border ${
                        selectedCategoryFilter === cat
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product selection list */}
              <div className="flex-1 overflow-y-auto max-h-[560px] space-y-2.5 pr-1">
                {searchableProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-lg border border-neutral-800/80">
                    No matching in-stock products found.
                  </div>
                ) : (
                  searchableProducts.map((p) => {
                    const sizesList = getProductSizesList(p);
                    const isAnySizeInCart = cart.some((i) => i.productId === p.id);
                    const unitsOfThisProdInCart = cart
                      .filter((i) => i.productId === p.id)
                      .reduce((sum, i) => sum + i.quantity, 0);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isAnySizeInCart
                            ? 'bg-neutral-950 border-amber-500/50 shadow-sm'
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Product Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 pr-1">
                            <div className="font-semibold text-neutral-100 truncate text-sm">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-neutral-500">{p.sku}</span>
                              <span>·</span>
                              <span className="text-neutral-300">{p.category}</span>
                              <span>·</span>
                              <span className="text-neutral-300">{p.color}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-neutral-100 text-sm">
                              {formatINR(p.sellingPrice)}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              Stock: <strong className="text-emerald-400">{p.quantity}</strong>
                              {unitsOfThisProdInCart > 0 && (
                                <span className="text-amber-400 ml-1">
                                  ({unitsOfThisProdInCart} in bill)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Size Selection Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
                          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                            <span className="font-medium text-neutral-300">
                              Click size to add to bill:
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {sizesList.length} size{sizesList.length > 1 ? 's' : ''} available
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {sizesList.map((sz) => {
                              const sizeStock = getProductSizeStock(p, sz);
                              const cartItemForSize = cart.find(
                                (item) => item.productId === p.id && item.size === sz
                              );
                              const isSizeSelected = !!cartItemForSize;
                              const isCurrentlyActive =
                                activeItemKey === `${p.id}-${sz}`;
                              const isOutOfStockForSize = Boolean(p.sizeQuantities && sizeStock <= 0);

                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => handleSelectProductAndSize(p, sz)}
                                  disabled={isOutOfStockForSize}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                    isOutOfStockForSize
                                      ? 'bg-neutral-900/40 text-neutral-600 border border-neutral-850 cursor-not-allowed opacity-40'
                                      : isCurrentlyActive
                                      ? 'bg-amber-500 text-neutral-950 border border-amber-400 font-black shadow-md ring-2 ring-amber-400/50 scale-[1.02] cursor-pointer'
                                      : isSizeSelected
                                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-extrabold cursor-pointer'
                                      : 'bg-neutral-900 hover:bg-amber-500 hover:text-neutral-950 text-amber-300 border border-neutral-750 cursor-pointer'
                                  }`}
                                  title={isOutOfStockForSize ? `Size ${sz} is out of stock` : `Click to select size ${sz} (Available: ${sizeStock})`}
                                >
                                  <span>{sz}</span>
                                  {p.sizeQuantities && (
                                    <span
                                      className={`text-[10px] font-mono px-1 rounded ${
                                        isCurrentlyActive
                                          ? 'text-neutral-900 font-black'
                                          : 'text-neutral-400 font-normal'
                                      }`}
                                    >
                                      ({sizeStock})
                                    </span>
                                  )}
                                  {isSizeSelected && (
                                    <span
                                      className={`text-[10px] font-mono px-1 py-0.2 rounded font-black ${
                                        isCurrentlyActive
                                          ? 'bg-neutral-950 text-amber-300'
                                          : 'bg-amber-500 text-neutral-950'
                                      }`}
                                    >
                                      x{cartItemForSize.quantity}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Active Item Panel & Customer Invoice Bill (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Messages Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-red-400 hover:text-red-200 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Active Selected Item & Quantity Entry Station (Points 1, 2, 3, 4, 5, 6) */}
          {activeCartItem && activeProduct && (
            <div className="bg-neutral-900 border-2 border-amber-500/50 rounded-xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-neutral-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3" />
                <span>Selected Product Details</span>
              </div>

              {/* Product Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800">
                <div className="pr-12">
                  <span className="font-mono text-xs text-amber-400/90 font-medium">
                    {activeProduct.sku} · {activeProduct.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-100">
                    {activeProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-300 mt-0.5">
                    <span>Color: <strong className="text-neutral-100">{activeProduct.color}</strong></span>
                    <span>·</span>
                    <span>
                      Selling Price: <strong className="text-amber-400 font-mono">{formatINR(activeProduct.sellingPrice)}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Available Stock:</span>
                  <span className="text-sm font-mono font-bold text-emerald-400 block">
                    {getProductSizeStock(activeProduct, activeCartItem.size)} units (Size {activeCartItem.size})
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Total All Sizes: {activeProduct.quantity} units
                  </span>
                </div>
              </div>

              {/* Size Chooser + Editable Quantity + Realtime Total */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 items-center">
                {/* 1. Size Selection (4 cols) */}
                <div className="md:col-span-5 bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Selected Size: <strong className="text-amber-400 font-mono text-xs">{activeCartItem.size}</strong>
                    <span className="text-[10px] text-neutral-400 font-normal ml-1.5">
                      ({getProductSizeStock(activeProduct, activeCartItem.size)} available)
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getProductSizesList(activeProduct).map((sz) => {
                      const szStock = getProductSizeStock(activeProduct, sz);
                      const isOutOfStock = Boolean(activeProduct.sizeQuantities && szStock <= 0);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleSelectProductAndSize(activeProduct, sz)}
                          disabled={isOutOfStock}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                            isOutOfStock
                              ? 'bg-neutral-900/40 text-neutral-600 border border-neutral-850 cursor-not-allowed opacity-40'
                              : activeCartItem.size === sz
                              ? 'bg-amber-500 text-neutral-950 border border-amber-400 shadow-sm font-black ring-2 ring-amber-400/30'
                              : 'bg-neutral-900 text-neutral-400 border border-neutral-750 hover:text-neutral-200 hover:border-neutral-600'
                          }`}
                          title={isOutOfStock ? `Size ${sz} is out of stock` : `Size ${sz} (${szStock} in stock)`}
                        >
                          <span>{sz}</span>
                          {activeProduct.sizeQuantities && (
                            <span className="text-[10px] font-normal opacity-80 ml-0.5">
                              ({szStock})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quantity to Sell Input (4 cols) */}
                <div className="md:col-span-4 bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Quantity to Sell:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItemQuantity(
                          activeCartItem.productId,
                          activeCartItem.size,
                          activeCartItem.quantity - 1
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 flex items-center justify-center font-bold text-sm transition-colors shadow-sm"
                      title="Decrease Quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={getProductSizeStock(activeProduct, activeCartItem.size)}
                      value={activeCartItem.quantity}
                      onChange={(e) =>
                        handleUpdateItemQuantity(
                          activeCartItem.productId,
                          activeCartItem.size,
                          Number(e.target.value)
                        )
                      }
                      className="w-20 h-8 text-center bg-neutral-950 border border-amber-500/60 rounded-lg text-neutral-100 font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItemQuantity(
                          activeCartItem.productId,
                          activeCartItem.size,
                          activeCartItem.quantity + 1
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 flex items-center justify-center font-bold text-sm transition-colors shadow-sm"
                      title="Increase Quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Max: {getProductSizeStock(activeProduct, activeCartItem.size)} units for Size {activeCartItem.size}
                  </span>
                </div>

                {/* 3. Automatic Total Amount (3 cols) */}
                <div className="md:col-span-3 bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 text-right flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-400 block font-mono">
                    ₹{activeCartItem.sellingPrice} × {activeCartItem.quantity}
                  </span>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Item Total</span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {formatINR(activeCartItem.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Bill / Cart Station (7 cols container) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    2. Customer Invoice Items ({cart.length})
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                  >
                    Clear Bill
                  </button>
                )}
              </div>

              {/* Cart Table */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800/80">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium text-neutral-300">
                    No items added to current bill yet.
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Click any size button (e.g. 36, 38, 40, M, L) from the left catalog to add products.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto mb-4 border border-neutral-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Product & Size</th>
                        <th className="py-2.5 px-2 font-semibold text-right">Unit Price</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Quantity</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Total Amount</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-200 bg-neutral-950/40">
                      {cart.map((item) => {
                        const itemKey = `${item.productId}-${item.size}`;
                        const isRowActive = activeItemKey === itemKey;
                        const parentProd = products.find((p) => p.id === item.productId);

                        return (
                          <tr
                            key={itemKey}
                            onClick={() => setActiveItemKey(itemKey)}
                            className={`cursor-pointer transition-colors ${
                              isRowActive
                                ? 'bg-amber-500/10 hover:bg-amber-500/15'
                                : 'hover:bg-neutral-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-neutral-100 flex items-center gap-2">
                                <span>{item.productName}</span>
                                {isRowActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-amber-300 font-mono font-bold border border-neutral-700">
                                  Size: {item.size}
                                </span>
                                <span>·</span>
                                <span>{item.color}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-right font-mono text-neutral-300">
                              {formatINR(item.sellingPrice)}
                            </td>

                            <td
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItemQuantity(
                                      item.productId,
                                      item.size,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold"
                                  title="Decrease"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={parentProd?.quantity || 9999}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQuantity(
                                      item.productId,
                                      item.size,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-12 text-center bg-transparent font-mono text-xs font-bold text-neutral-100 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItemQuantity(
                                      item.productId,
                                      item.size,
                                      item.quantity + 1
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold"
                                  title="Increase"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                              {formatINR(item.subtotal)}
                            </td>

                            <td
                              className="py-2.5 px-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId, item.size)}
                                className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Customer & Billing Form (Points 7, 8, 9) */}
            <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-neutral-800 text-xs">
              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/90">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Customer Name</span>
                    </label>
                    {customers && customers.length > 0 && (
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        {customers.length} saved
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    list="customer-names-list"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      const match = customers?.find((c) => c.name.toLowerCase() === val.toLowerCase());
                      if (match && match.phone && !customerPhone) {
                        setCustomerPhone(match.phone);
                      }
                    }}
                    placeholder="Enter customer name (or leave for Walk-in)"
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <datalist id="customer-names-list">
                    {customers?.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.phone ? `Phone: ${c.phone}` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    list="customer-phones-list"
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerPhone(val);
                      const match = customers?.find((c) => c.phone === val);
                      if (match && match.name && !customerName) {
                        setCustomerName(match.name);
                      }
                    }}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <datalist id="customer-phones-list">
                    {customers?.filter((c) => c.phone).map((c) => (
                      <option key={c.id} value={c.phone}>
                        {c.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block font-medium text-neutral-300 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'Cash', label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> },
                      { id: 'UPI', label: 'UPI', icon: <QrCode className="w-3.5 h-3.5" /> },
                      { id: 'Card', label: 'Card', icon: <CreditCard className="w-3.5 h-3.5" /> },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Summary & Complete Sale Action */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Items Subtotal ({totalUnitsInBill} units):</span>
                  <span className="font-mono tabular-nums text-neutral-200 font-semibold">
                    {formatINR(cartSubtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-400">
                  <span>Discount (₹):</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-neutral-500">- ₹</span>
                    <input
                      type="number"
                      min="0"
                      max={cartSubtotal}
                      value={discount}
                      onChange={(e) =>
                        setDiscount(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-24 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-right font-mono text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-neutral-400 block uppercase tracking-wider">
                      Grand Total Payable
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-400">
                      {formatINR(cartTotal)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={cart.length === 0 || isSubmitting}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                    <span>{isSubmitting ? 'Processing Bill...' : 'Complete Sale & Print Bill'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sales History & Invoices Ledger */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-200">
              Sales History & Invoices ({filteredSales.length})
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Total Revenue: <strong className="font-mono text-amber-400 font-semibold">{formatINR(historyTotalRevenue)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period tabs */}
            <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: '7 Days' },
                  { id: 'month', label: '30 Days' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setHistoryPeriod(p.id)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyPeriod === p.id
                      ? 'bg-neutral-800 text-amber-400 font-medium'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search invoice or customer..."
                className="pl-3 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 w-48"
              />
            </div>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-xl border border-neutral-800/80">
            {sales.length === 0
              ? 'No sales recorded yet. Once you bill a customer, the invoice will appear here.'
              : 'No sales match the selected search or filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="pb-2.5 font-medium">Invoice #</th>
                  <th className="pb-2.5 font-medium">Date & Time</th>
                  <th className="pb-2.5 font-medium">Customer Name</th>
                  <th className="pb-2.5 font-medium">Mobile Number</th>
                  <th className="pb-2.5 font-medium">Items Sold</th>
                  <th className="pb-2.5 font-medium">Payment Mode</th>
                  <th className="pb-2.5 font-medium text-right">Total Amount</th>
                  <th className="pb-2.5 font-medium text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-800/30">
                    <td className="py-3 font-mono font-medium text-neutral-200">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 text-neutral-400">
                      {formatDateTime(sale.date)}
                    </td>
                    <td className="py-3 font-medium text-neutral-200">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 font-mono text-neutral-400">
                      {sale.customerPhone || '—'}
                    </td>
                    <td className="py-3 text-neutral-300">
                      {sale.items
                        .map((i) => `${i.productName} [${i.size}] (x${i.quantity})`)
                        .join(', ')}
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-neutral-300">{sale.paymentMethod}</span>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-bold text-amber-400">
                      {formatINR(sale.totalAmount)}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => onViewReceipt(sale)}
                        className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                        title="View / Print Bill"
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
    </div>
  );
};
