import React, { useState, useEffect, useMemo } from 'react';
import { Product, SHIRT_SIZES, PANT_SIZES, NO_SIZE } from '../types';
import { CATEGORIES } from '../data/seedData';
import { X, Check, PackagePlus, AlertCircle, Sparkles, Camera } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
  onOpenScanner?: () => void;
}

// Helper to determine sizes based on category
export function getCategorySizeConfig(category: string): {
  type: 'shirts' | 'pants' | 'suits' | 'other';
  primarySizes: string[];
  helperText: string;
} {
  const cat = category.toLowerCase().trim();

  // Shirts / T-Shirts: M, L, XL, XXL
  if (
    cat.includes('shirt') ||
    cat.includes('t-shirt') ||
    cat.includes('polo') ||
    cat.includes('kurta')
  ) {
    return {
      type: 'shirts',
      primarySizes: [...SHIRT_SIZES],
      helperText: 'Shirts / T-Shirts standard sizing: M, L, XL, XXL',
    };
  }

  // Jeans / Trousers / Formal Pants: 30, 32, 34, 36, 38
  if (
    cat.includes('jean') ||
    cat.includes('trouser') ||
    cat.includes('pant') ||
    cat.includes('chino')
  ) {
    return {
      type: 'pants',
      primarySizes: [...PANT_SIZES],
      helperText: 'Jeans / Trousers / Formal Pants waist sizing: 30, 32, 34, 36, 38',
    };
  }

  // Blazers & Suits
  if (cat.includes('blazer') || cat.includes('suit')) {
    return {
      type: 'suits',
      primarySizes: ['36', '38', '40', '42', '44'],
      helperText: 'Blazers & Suits chest sizing: 36, 38, 40, 42, 44',
    };
  }

  // Accessories and other un-sized products: No Size
  return {
    type: 'other',
    primarySizes: [],
    helperText: 'Products that do not have sizes (Accessories, Belts, Wallets, etc.)',
  };
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  initialBarcode,
  onOpenScanner,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<string>('Casual Shirts');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['M', 'L', 'XL', 'XXL']);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number | ''>>({});
  const [color, setColor] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [minimumStockLevel, setMinimumStockLevel] = useState<number | ''>(10);
  const [error, setError] = useState('');

  const [sizeSystem, setSizeSystem] = useState<'auto' | 'shirts' | 'pants' | 'no-size'>('auto');

  const sizeConfig = getCategorySizeConfig(category);
  const activeType = sizeSystem === 'auto' ? sizeConfig.type : sizeSystem;
  const currentSizes =
    activeType === 'shirts'
      ? [...SHIRT_SIZES]
      : activeType === 'pants'
      ? [...PANT_SIZES]
      : activeType === 'suits'
      ? ['36', '38', '40', '42', '44']
      : [];

  // Automatically calculate total stock by adding quantities of all selected sizes
  const totalCalculatedQuantity = useMemo(() => {
    return selectedSizes.reduce((sum, s) => {
      const q = sizeQuantities[s];
      return sum + (typeof q === 'number' && !isNaN(q) ? q : 0);
    }, 0);
  }, [selectedSizes, sizeQuantities]);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category);
      setSizeSystem('auto');

      // Preserve all existing sizes from the edited product (including Tarkey and Ropid products)
      let initialSizes = ['M', 'L', 'XL', 'XXL'];
      if (productToEdit.sizes && productToEdit.sizes.length > 0) {
        initialSizes = productToEdit.sizes;
      } else if (productToEdit.size) {
        const parsed = productToEdit.size.split(',').map((s) => s.trim()).filter(Boolean);
        initialSizes = parsed.length > 0 ? parsed : ['M', 'L', 'XL', 'XXL'];
      } else {
        const config = getCategorySizeConfig(productToEdit.category);
        initialSizes = config.primarySizes.length > 0 ? [...config.primarySizes] : [NO_SIZE];
      }
      setSelectedSizes(initialSizes);

      // Load size-wise quantities if present, or initialize empty fields for editing
      const initialQtyMap: Record<string, number | ''> = {};
      if (productToEdit.sizeQuantities && Object.keys(productToEdit.sizeQuantities).length > 0) {
        initialSizes.forEach((s) => {
          initialQtyMap[s] = typeof productToEdit.sizeQuantities?.[s] === 'number'
            ? productToEdit.sizeQuantities[s]
            : '';
        });
      } else if (initialSizes.length === 1) {
        initialQtyMap[initialSizes[0]] = productToEdit.quantity;
      } else {
        initialSizes.forEach((s) => {
          initialQtyMap[s] = '';
        });
      }
      setSizeQuantities(initialQtyMap);

      setColor(productToEdit.color);
      setPurchasePrice(productToEdit.purchasePrice);
      setSellingPrice(productToEdit.sellingPrice);
      setMinimumStockLevel(productToEdit.minimumStockLevel);
    } else {
      setName('');
      setCategory('Casual Shirts');
      setSizeSystem('auto');
      setBarcode(initialBarcode || '');
      const defaultSizes = ['M', 'L', 'XL', 'XXL'];
      setSelectedSizes(defaultSizes);
      const initialQtyMap: Record<string, number | ''> = {};
      defaultSizes.forEach((s) => {
        initialQtyMap[s] = '';
      });
      setSizeQuantities(initialQtyMap);

      setColor('');
      setPurchasePrice('');
      setSellingPrice('');
      setMinimumStockLevel(10);
      generateSkuForCategory('Casual Shirts');
    }
    setError('');
  }, [productToEdit, isOpen, initialBarcode]);

  const generateSkuForCategory = (cat: string) => {
    const prefix = cat.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setSku(`SMW-${prefix}-${randomSuffix}`);
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setSizeSystem('auto');
    if (!productToEdit) {
      generateSkuForCategory(newCat);
      const newConfig = getCategorySizeConfig(newCat);
      const newSizes = newConfig.primarySizes.length > 0 ? [...newConfig.primarySizes] : [NO_SIZE];
      setSelectedSizes(newSizes);
      const newQtyMap: Record<string, number | ''> = {};
      newSizes.forEach((s) => {
        newQtyMap[s] = '';
      });
      setSizeQuantities(newQtyMap);
    }
  };

  // Toggle a specific size
  const toggleSize = (sizeOption: string) => {
    // If clicking a standard size, remove 'No Size' if it was selected
    const withoutNoSize = selectedSizes.filter((s) => s !== NO_SIZE);

    if (withoutNoSize.includes(sizeOption)) {
      const remaining = withoutNoSize.filter((s) => s !== sizeOption);
      setSelectedSizes(remaining);
      setSizeQuantities((prev) => {
        const copy = { ...prev };
        delete copy[sizeOption];
        return copy;
      });
    } else {
      setSelectedSizes([...withoutNoSize, sizeOption]);
      setSizeQuantities((prev) => ({
        ...prev,
        [sizeOption]: prev[sizeOption] !== undefined ? prev[sizeOption] : '',
      }));
    }
  };

  // Select 'No Size'
  const handleSelectNoSize = () => {
    if (selectedSizes.includes(NO_SIZE)) {
      setSelectedSizes([]);
      setSizeQuantities({});
    } else {
      setSelectedSizes([NO_SIZE]);
      setSizeQuantities({ [NO_SIZE]: '' });
    }
  };

  const selectAllCategorySizes = () => {
    if (currentSizes.length > 0) {
      setSelectedSizes([...currentSizes]);
      setSizeQuantities((prev) => {
        const next: Record<string, number | ''> = {};
        currentSizes.forEach((s) => {
          next[s] = prev[s] !== undefined ? prev[s] : '';
        });
        return next;
      });
    } else {
      setSelectedSizes([NO_SIZE]);
      setSizeQuantities({ [NO_SIZE]: '' });
    }
  };

  const clearAllSizes = () => {
    setSelectedSizes([]);
    setSizeQuantities({});
  };

  // Handle quantity change for a specific size
  const handleSizeQuantityChange = (size: string, val: string) => {
    if (val === '') {
      setSizeQuantities((prev) => ({ ...prev, [size]: '' }));
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setSizeQuantities((prev) => ({ ...prev, [size]: parsed }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter the Product Name.');
      return;
    }
    if (!category.trim()) {
      setError('Please select or specify a Category.');
      return;
    }
    if (selectedSizes.length === 0) {
      setError('Please select at least one size or select "No Size" for this product.');
      return;
    }
    if (!color.trim()) {
      setError('Please specify the Color.');
      return;
    }
    if (purchasePrice === '' || Number(purchasePrice) < 0) {
      setError('Please enter a valid Purchase Price (≥ 0).');
      return;
    }
    if (sellingPrice === '' || Number(sellingPrice) <= 0) {
      setError('Please enter a valid Selling Price (> 0).');
      return;
    }
    if (Number(sellingPrice) < Number(purchasePrice)) {
      setError('Warning: Selling Price is lower than Purchase Price. Please verify.');
      return;
    }

    // Validate size-wise quantities: non-negative whole numbers, no blank quantities
    for (const size of selectedSizes) {
      const q = sizeQuantities[size];
      if (q === '' || q === undefined || q === null) {
        setError(`Please enter a valid stock quantity for size "${size}". Blank quantities are not allowed.`);
        return;
      }
      const num = Number(q);
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        setError(`Stock quantity for size "${size}" must be a non-negative whole number (0, 1, 2, ...).`);
        return;
      }
    }

    if (minimumStockLevel === '' || Number(minimumStockLevel) < 0) {
      setError('Please enter a valid Minimum Stock Level.');
      return;
    }

    const finalSizeQuantities: Record<string, number> = {};
    selectedSizes.forEach((s) => {
      finalSizeQuantities[s] = Number(sizeQuantities[s]) || 0;
    });

    onSave({
      name: name.trim(),
      sku: sku.trim().toUpperCase() || `SMW-${Date.now().toString().slice(-4)}`,
      barcode: barcode.trim() || undefined,
      category: category.trim(),
      sizes: selectedSizes,
      size: selectedSizes.join(', '),
      sizeQuantities: finalSizeQuantities,
      color: color.trim(),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      quantity: totalCalculatedQuantity,
      minimumStockLevel: Number(minimumStockLevel),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {productToEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-neutral-400">
                Category-specific sizing with combined stock tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Product Name */}
          <div>
            <label className="block font-medium text-neutral-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tarkey Brand Casual Shirt, Denim Slim Jeans"
              required
              autoFocus
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 2. Category, SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-neutral-300">Product SKU *</label>
                <button
                  type="button"
                  onClick={() => generateSkuForCategory(category)}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto</span>
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SMW-CSH-101"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-neutral-300 flex items-center gap-1">
                  <span>Barcode / SKU</span>
                  <span className="text-[10px] text-neutral-500 font-normal">(Optional)</span>
                </label>
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                    title="Scan barcode with camera"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode / EAN"
                  className="w-full pl-3 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title="Scan barcode with camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Category-Dependent Multiple Sizes Selector */}
          <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <label className="block font-medium text-neutral-200 text-xs">
                  Available Sizes for {category} *
                </label>
                <span className="text-[11px] text-neutral-400">
                  {sizeConfig.helperText}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                {currentSizes.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={selectAllCategorySizes}
                      className="text-amber-400 hover:underline px-1.5 py-0.5"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-600">·</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={clearAllSizes}
                  className="text-neutral-400 hover:text-neutral-200 px-1.5 py-0.5"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick Preset Switching Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mr-1">
                Size Group:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSizeSystem('shirts');
                  setSelectedSizes([...SHIRT_SIZES]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  activeType === 'shirts'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                Shirts / T-Shirts (M, L, XL, XXL)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSizeSystem('pants');
                  setSelectedSizes([...PANT_SIZES]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  activeType === 'pants'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                Jeans / Trousers / Pants (30, 32, 34, 36, 38)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSizeSystem('no-size');
                  setSelectedSizes([NO_SIZE]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  selectedSizes.includes(NO_SIZE)
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                No Size
              </button>
            </div>

            {/* Buttons Grid for Category Sizes + No Size */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentSizes.map((sizeOption) => {
                const isSelected = selectedSizes.includes(sizeOption);
                return (
                  <button
                    key={sizeOption}
                    type="button"
                    onClick={() => toggleSize(sizeOption)}
                    className={`flex-1 min-w-[58px] py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-sm font-mono tracking-wide">{sizeOption}</span>
                    <span className="text-[10px] font-medium leading-none">
                      {isSelected ? 'Selected' : 'Add'}
                    </span>
                  </button>
                );
              })}

              {/* No Size Option Button */}
              <button
                type="button"
                onClick={handleSelectNoSize}
                className={`min-w-[80px] py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  selectedSizes.includes(NO_SIZE)
                    ? 'bg-amber-500 border-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <span className="text-sm font-mono tracking-wide">{NO_SIZE}</span>
                <span className="text-[10px] font-medium leading-none">
                  {selectedSizes.includes(NO_SIZE) ? 'Selected' : 'Free / Any'}
                </span>
              </button>
            </div>

            {/* Summary preview of selected sizes */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-neutral-400 border-t border-neutral-800/80">
              <span>Selected for this product:</span>
              <span className="font-mono font-semibold text-neutral-200">
                {selectedSizes.length > 0 ? selectedSizes.join(', ') : 'None selected (select sizes above)'}
              </span>
            </div>
          </div>

          {/* 4. Color */}
          <div>
            <label className="block font-medium text-neutral-300 mb-1">
              Color *
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Navy Blue, White, Black, Dark Grey"
              required
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 5. Purchase Price & 6. Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                Purchase Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 420"
                  required
                  className="w-full pl-7 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Price paid to supplier/wholesaler</span>
            </div>

            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                Selling Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 650"
                  required
                  className="w-full pl-7 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                {purchasePrice && sellingPrice && Number(sellingPrice) > Number(purchasePrice)
                  ? `Gross Margin: ₹${Number(sellingPrice) - Number(purchasePrice)}`
                  : 'Customer retail billing price'}
              </span>
            </div>
          </div>

          {/* 7. Size-wise Stock Quantity Breakdown */}
          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
              <div>
                <label className="block text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Size-wise Stock Quantity *
                </label>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Enter quantity for each size. Total stock is calculated automatically.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 self-start sm:self-auto">
                <span className="text-[11px] text-neutral-400 font-medium">Total Stock:</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {totalCalculatedQuantity} pcs
                </span>
              </div>
            </div>

            {selectedSizes.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-900/60 rounded-lg border border-neutral-800">
                Please select sizes above to enter their individual stock quantities.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {selectedSizes.map((size) => {
                    const qtyVal = sizeQuantities[size] ?? '';
                    return (
                      <div
                        key={size}
                        className="bg-neutral-900 border border-neutral-800 focus-within:border-amber-500 rounded-xl p-3 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-mono text-xs font-bold border border-neutral-700">
                            {size === NO_SIZE ? 'No Size' : `Size: ${size}`}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-medium">Quantity</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={qtyVal}
                            onChange={(e) => handleSizeQuantityChange(size, e.target.value)}
                            placeholder="0"
                            required
                            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono text-sm font-bold focus:outline-none focus:border-amber-400 tabular-nums"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculation summary banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs">
                  <span className="text-neutral-400 text-[11px] flex items-center gap-1.5 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span className="font-medium text-neutral-300">Sum of sizes:</span>
                    <span className="font-mono text-neutral-400">
                      {selectedSizes.map((s) => `${s} (${sizeQuantities[s] === '' ? 0 : sizeQuantities[s] ?? 0})`).join(' + ')}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-xs shrink-0">
                    Total Stock = {totalCalculatedQuantity}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 8. Minimum Stock Level */}
          <div>
            <label className="block font-medium text-neutral-300 mb-1">
              Minimum Stock Level (Alert Threshold) *
            </label>
            <input
              type="number"
              min="1"
              value={minimumStockLevel}
              onChange={(e) => setMinimumStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 20"
              required
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-neutral-500 mt-0.5 block">
              Triggers a low-stock alert when total combined inventory reaches or falls below this number
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{productToEdit ? 'Save Changes' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
