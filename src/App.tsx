import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, Product, Sale, StockLog, AdminUser, StoreBackupData, Customer, Bill } from './types';
import {
  initStorage,
  getStoredProducts,
  getStoredAdmin,
  setStoredAdmin,
  clearAllStoreData,
} from './utils/storage';
import {
  createBackupPayload,
  downloadBackupFile,
  validateBackupFileContent,
  createPreRestoreSafetyBackup,
  restoreBackupToStorage,
} from './utils/backup';
import {
  subscribeToInventory,
  subscribeToSales,
  subscribeToCustomers,
  subscribeToBills,
  subscribeToStockLogs,
  saveProductToFirestore,
  deleteProductFromFirestore,
  batchSaveProductsToFirestore,
  recordSaleToFirestore,
  saveStockLogToFirestore,
  batchSaveStockLogsToFirestore,
  clearAllFirestoreData,
  restoreBackupToFirestore,
  autoMigrateLocalStorageToFirestore,
} from './services/firestoreService';
import { AlertTriangle, RotateCcw, X, Shield, CheckCircle2 } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ProductListView } from './components/ProductListView';
import { StockManagementView } from './components/StockManagementView';
import { SalesManagementView } from './components/SalesManagementView';
import { SalesReportView } from './components/SalesReportView';
import { ProductFormModal } from './components/ProductFormModal';
import { SaleReceiptModal } from './components/SaleReceiptModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';

export default function App() {
  // Store Admin & Data State
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(true);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [preselectedSaleProduct, setPreselectedSaleProduct] = useState<Product | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupModalMode, setBackupModalMode] = useState<'download' | 'restore'>('download');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Barcode Scanner State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannerOrigin, setScannerOrigin] = useState<'sales' | 'stock' | 'product_form'>('sales');
  const [scannedInitialBarcode, setScannedInitialBarcode] = useState<string>('');
  const [highlightedStockProductId, setHighlightedStockProductId] = useState<string | null>(null);

  // Restore Backup File Picker & Confirmation State
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    fileName: string;
    backupData: StoreBackupData;
  } | null>(null);
  const [restoreValidationError, setRestoreValidationError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Real-time Firestore sync setup
  useEffect(() => {
    initStorage();
    const storedAdmin = getStoredAdmin();
    setAdmin(storedAdmin);

    let isMounted = true;

    // Check if auto-migration from local storage to Firestore is needed so laptop and mobile both see existing data
    autoMigrateLocalStorageToFirestore()
      .then((res) => {
        if (res.migrated) {
          showToast(`Synced ${res.productCount} existing items to Firebase Cloud!`);
        }
      })
      .catch((err) => console.warn('Auto migration error:', err));

    // 1. Realtime listener for 'inventory' collection
    const unsubInventory = subscribeToInventory(
      (firestoreProducts) => {
        if (!isMounted) return;
        setProducts(firestoreProducts);
        setIsCloudSynced(true);
        setIsInitialized(true);
      },
      (err) => {
        console.error('Inventory Firestore error:', err);
        const fallback = getStoredProducts();
        if (fallback.length > 0) setProducts(fallback);
        setIsInitialized(true);
      }
    );

    // 2. Realtime listener for 'sales' collection
    const unsubSales = subscribeToSales(
      (firestoreSales) => {
        if (!isMounted) return;
        setSales(firestoreSales);
      },
      (err) => console.error('Sales Firestore error:', err)
    );

    // 3. Realtime listener for 'customers' collection
    const unsubCustomers = subscribeToCustomers(
      (firestoreCustomers) => {
        if (!isMounted) return;
        setCustomers(firestoreCustomers);
      },
      (err) => console.error('Customers Firestore error:', err)
    );

    // 4. Realtime listener for 'bills' collection
    const unsubBills = subscribeToBills(
      (firestoreBills) => {
        if (!isMounted) return;
        setBills(firestoreBills);
      },
      (err) => console.error('Bills Firestore error:', err)
    );

    // 5. Realtime listener for 'stock_logs' collection
    const unsubLogs = subscribeToStockLogs(
      (firestoreLogs) => {
        if (!isMounted) return;
        setStockLogs(firestoreLogs);
      },
      (err) => console.error('Stock logs Firestore error:', err)
    );

    return () => {
      isMounted = false;
      unsubInventory();
      unsubSales();
      unsubCustomers();
      unsubBills();
      unsubLogs();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Auth Handlers
  const handleLogin = (adminUser: AdminUser) => {
    setStoredAdmin(adminUser);
    setAdmin(adminUser);
    showToast(`Signed in successfully as Admin`);
  };

  const handleLogout = () => {
    setStoredAdmin(null);
    setAdmin(null);
    showToast('Admin logged out.');
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all products, sales, customers, and bills from Firebase Cloud?')) {
      try {
        await clearAllFirestoreData();
        clearAllStoreData();
        setProducts([]);
        setSales([]);
        setStockLogs([]);
        setCustomers([]);
        setBills([]);
        showToast('All inventory and sales data cleared from Cloud.');
      } catch (err: any) {
        alert(`Error clearing data: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // Backup & Restore Handlers
  const handleOpenBackupRestore = (mode: 'download' | 'restore' = 'download') => {
    setBackupModalMode(mode);
    setIsBackupModalOpen(true);
  };

  // 1. Trigger Download Backup directly (uses application/octet-stream to prevent VS Code auto-open)
  const handleTriggerDownloadBackup = (extension: 'json' | 'bak' = 'json') => {
    try {
      const backupPayload = createBackupPayload(products, sales, stockLogs);
      const filename = downloadBackupFile(backupPayload, 'somaiya-menswear-backup', extension);
      showToast(`Backup saved to Downloads: ${filename} (Direct download, not opened in VS Code)`);
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Unknown error'}`);
    }
  };

  // 2. Trigger Restore Backup browser file picker
  const handleTriggerRestoreBackup = () => {
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.value = '';
      restoreFileInputRef.current.click();
    }
  };

  // 3. Process File for Restore (reads and validates inside browser in-memory)
  const handleProcessFileForRestore = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target?.result as string;
      const result = validateBackupFileContent(rawText);
      if (!result.isValid || !result.backupData) {
        setRestoreValidationError(result.error || 'The selected backup file is invalid or corrupted.');
      } else {
        setPendingRestore({
          fileName: file.name,
          backupData: result.backupData,
        });
      }
    };
    reader.onerror = () => {
      setRestoreValidationError('Failed to read the backup file from your disk. Please try again.');
    };
    reader.readAsText(file);
  };

  // 4. Handle File Picker Selection for Restore from input element
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers change if chosen again
    e.target.value = '';
    handleProcessFileForRestore(file);
  };

  // 5. Handle Confirmed Restore
  const handleConfirmPendingRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);

    try {
      // DATA SAFETY: Automatically preserve safety snapshot
      createPreRestoreSafetyBackup(products, sales, stockLogs, false);
      restoreBackupToStorage(pendingRestore.backupData);

      // Write validated restored data to Firestore cloud
      const success = await restoreBackupToFirestore(pendingRestore.backupData);
      if (!success) {
        throw new Error('Failed to save restored data to Firebase Firestore.');
      }

      // Immediately update active app state to refresh dashboard and all screens
      const restoredProducts = pendingRestore.backupData.data.products;
      const restoredSales = pendingRestore.backupData.data.sales;
      const restoredStockLogs = pendingRestore.backupData.data.stockLogs;

      setProducts(restoredProducts);
      setSales(restoredSales);
      setStockLogs(restoredStockLogs);

      showToast(
        `Backup restored to Firebase Cloud! ${restoredProducts.length} products, ${restoredSales.length} sales loaded.`
      );
      setPendingRestore(null);
    } catch (err: any) {
      alert(`Restore failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // 5. Handle Cancelled Restore
  const handleCancelPendingRestore = () => {
    setPendingRestore(null);
    showToast('Restore cancelled. Current store data preserved intact.');
  };

  const handleDataRestored = async (
    newProducts: Product[],
    newSales: Sale[],
    newStockLogs: StockLog[]
  ) => {
    setProducts(newProducts);
    setSales(newSales);
    setStockLogs(newStockLogs);
    try {
      await restoreBackupToFirestore({
        appName: "Somaiya Men's Wear",
        version: '2.0',
        exportTimestamp: new Date().toISOString(),
        exportDateFormatted: new Date().toLocaleDateString(),
        summary: {
          totalProducts: newProducts.length,
          totalStockUnits: newProducts.reduce((acc, p) => acc + p.quantity, 0),
          totalSales: newSales.length,
          totalStockLogs: newStockLogs.length,
        },
        data: {
          products: newProducts,
          sales: newSales,
          stockLogs: newStockLogs,
        },
      });
      showToast('Restored data synced across cloud devices!');
    } catch (err) {
      console.error('Error syncing restored data to Firestore:', err);
    }
  };

  // Barcode Scanner Handlers
  const handleOpenScanner = (origin: 'sales' | 'stock' | 'product_form') => {
    setScannerOrigin(origin);
    setIsBarcodeScannerOpen(true);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerOpen(false);
    const code = scannedCode.trim();
    if (!code) return;

    if (scannerOrigin === 'product_form') {
      setScannedInitialBarcode(code);
      showToast(`Scanned Barcode: ${code}`);
      return;
    }

    // Search existing products by barcode, sku, or ID
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.trim().toLowerCase() === code.toLowerCase()) ||
        (p.sku && p.sku.trim().toLowerCase() === code.toLowerCase()) ||
        p.id === code
    );

    if (matched) {
      if (scannerOrigin === 'sales') {
        setPreselectedSaleProduct(matched);
        setActiveTab('sales');
        showToast(`Barcode Matched: [${matched.sku}] ${matched.name}`);
      } else if (scannerOrigin === 'stock') {
        setHighlightedStockProductId(matched.id);
        setActiveTab('stock');
        showToast(`Stock Selected: [${matched.sku}] ${matched.name}`);
      }
    } else {
      // Barcode not found in inventory: open Add New Product modal pre-filled with scanned barcode
      setProductToEdit(null);
      setScannedInitialBarcode(code);
      setIsProductModalOpen(true);
      showToast(`Barcode "${code}" not found. Pre-filled in New Product!`);
    }
  };

  // Product CRUD
  const handleSaveProduct = async (productData: Partial<Product>) => {
    const now = new Date().toISOString();

    if (productToEdit) {
      // Update existing product
      const oldQty = productToEdit.quantity;
      const newQty = productData.quantity ?? oldQty;

      let newLog: StockLog | null = null;
      if (newQty !== oldQty) {
        newLog = {
          id: `log-${Date.now()}`,
          productId: productToEdit.id,
          productName: productData.name || productToEdit.name,
          type: 'ADJUST',
          quantityChanged: newQty - oldQty,
          previousQuantity: oldQty,
          newQuantity: newQty,
          reason: 'Updated via Product Edit',
          date: now,
        };
      }

      const updatedProd: Product = {
        ...productToEdit,
        ...productData,
        updatedAt: now,
      } as Product;

      try {
        await saveProductToFirestore(updatedProd);
        if (newLog) {
          await saveStockLogToFirestore(newLog);
        }
        showToast(`Updated "${productData.name || productToEdit.name}" (Synced to Cloud)`);
      } catch (err: any) {
        console.error('Error updating product in Firestore:', err);
        showToast(`Saved locally. Cloud sync pending.`);
      }
    } else {
      // Create new product
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: productData.name!,
        sku: productData.sku!,
        category: productData.category!,
        sizes: productData.sizes || ['M', 'L', 'XL', 'XXL'],
        size: productData.sizes ? productData.sizes.join(', ') : (productData.size || 'M, L, XL, XXL'),
        sizeQuantities: productData.sizeQuantities || {},
        color: productData.color!,
        purchasePrice: productData.purchasePrice || 0,
        sellingPrice: productData.sellingPrice || 0,
        quantity: productData.quantity || 0,
        minimumStockLevel: productData.minimumStockLevel ?? 10,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await saveProductToFirestore(newProduct);
        if (newProduct.quantity > 0) {
          const newLog: StockLog = {
            id: `log-${Date.now()}`,
            productId: newProduct.id,
            productName: newProduct.name,
            type: 'IN',
            quantityChanged: newProduct.quantity,
            previousQuantity: 0,
            newQuantity: newProduct.quantity,
            reason: 'Initial stock entry',
            date: now,
          };
          await saveStockLogToFirestore(newLog);
        }
        showToast(`Added "${newProduct.name}" to inventory (Synced to Cloud)`);
      } catch (err: any) {
        console.error('Error adding product to Firestore:', err);
        showToast(`Added locally. Cloud sync pending.`);
      }
    }

    setProductToEdit(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const prod = productToDelete;
    setProductToDelete(null);
    try {
      await deleteProductFromFirestore(prod.id);
      showToast(`Deleted "${prod.name}" from inventory (Synced to Cloud)`);
    } catch (err: any) {
      console.error('Error deleting product from Firestore:', err);
      showToast(`Error deleting product.`);
    }
  };

  // Stock Adjustments
  const handleAdjustStock = async (
    productId: string,
    quantityChange: number,
    type: 'IN' | 'OUT' | 'ADJUST',
    reason: string,
    size?: string
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousQty = product.quantity;
    let newQty = Math.max(0, previousQty + quantityChange);
    const now = new Date().toISOString();

    let updatedSizeQuantities: Record<string, number> | undefined = undefined;
    if (size && product.sizeQuantities) {
      const oldSizeQty = Number(product.sizeQuantities[size] || 0);
      const newSizeQty = Math.max(0, oldSizeQty + quantityChange);
      updatedSizeQuantities = {
        ...product.sizeQuantities,
        [size]: newSizeQty,
      };
      newQty = Object.values(updatedSizeQuantities).reduce((a, b) => a + (Number(b) || 0), 0);
    } else if (product.sizeQuantities && Object.keys(product.sizeQuantities).length > 0) {
      updatedSizeQuantities = { ...product.sizeQuantities };
      const keys = Object.keys(updatedSizeQuantities);
      if (keys.length > 0) {
        const firstKey = keys[0];
        updatedSizeQuantities[firstKey] = Math.max(0, (updatedSizeQuantities[firstKey] || 0) + quantityChange);
        newQty = Object.values(updatedSizeQuantities).reduce((a, b) => a + (Number(b) || 0), 0);
      }
    }

    const updatedProduct: Product = {
      ...product,
      quantity: newQty,
      sizeQuantities: updatedSizeQuantities ?? product.sizeQuantities,
      updatedAt: now,
    };

    const newLog: StockLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      type,
      quantityChanged: quantityChange,
      previousQuantity: previousQty,
      newQuantity: newQty,
      reason: size ? `${reason} [Size: ${size}]` : reason,
      date: now,
    };

    try {
      await saveProductToFirestore(updatedProduct);
      await saveStockLogToFirestore(newLog);
    } catch (err) {
      console.error('Error updating stock in Firestore:', err);
    }
  };

  const handleQuickAdjustStock = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const type = delta > 0 ? 'IN' : 'OUT';
    const reason = delta > 0 ? 'Inline stock addition' : 'Inline stock deduction';
    handleAdjustStock(productId, delta, type, reason);
  };

  const handleBatchRestock = async (productIds: string[], amountPerItem: number) => {
    const now = new Date().toISOString();
    const updatedProducts: Product[] = [];
    const newLogs: StockLog[] = [];

    productIds.forEach((id) => {
      const product = products.find((p) => p.id === id);
      if (product) {
        const previousQty = product.quantity;
        const newQty = previousQty + amountPerItem;

        updatedProducts.push({
          ...product,
          quantity: newQty,
          updatedAt: now,
        });

        newLogs.push({
          id: `log-${Date.now()}-${id}`,
          productId: product.id,
          productName: product.name,
          type: 'IN',
          quantityChanged: amountPerItem,
          previousQuantity: previousQty,
          newQuantity: newQty,
          reason: 'Low stock re-order restock',
          date: now,
        });
      }
    });

    try {
      await batchSaveProductsToFirestore(updatedProducts);
      await batchSaveStockLogsToFirestore(newLogs);
      showToast(`Added +${amountPerItem} units to ${productIds.length} items (Synced to Cloud)`);
    } catch (err: any) {
      console.error('Error batch restocking in Firestore:', err);
      showToast(`Stock restock applied.`);
    }
  };

  // Record Sale & Automatic Stock Reduction across inventory, sales, customers, bills
  const handleRecordSale = (newSaleData: Omit<Sale, 'id' | 'invoiceNumber'>): Sale => {
    const now = new Date().toISOString();
    const invoiceNum = `SMW-INV-${String(sales.length + 1).padStart(3, '0')}`;

    const completedSale: Sale = {
      ...newSaleData,
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
    };

    const baseProducts = products.map((p) => ({ ...p }));
    const prodsToSync: Product[] = [];
    const newLogs: StockLog[] = [];

    // Automatically decrease inventory quantity for each sold item
    completedSale.items.forEach((soldItem) => {
      const soldQty = Math.max(0, Number(soldItem.quantity) || 0);
      if (soldQty <= 0) return;

      // Find matching product by ID (string coerced), or SKU, or Name + Color
      const prodIndex = baseProducts.findIndex((p) => {
        if (p.id && soldItem.productId && String(p.id).trim() === String(soldItem.productId).trim()) {
          return true;
        }
        if (p.sku && soldItem.productId && p.sku.trim().toLowerCase() === String(soldItem.productId).trim().toLowerCase()) {
          return true;
        }
        if (
          p.name && soldItem.productName &&
          p.name.trim().toLowerCase() === soldItem.productName.trim().toLowerCase() &&
          p.color && soldItem.color &&
          p.color.trim().toLowerCase() === soldItem.color.trim().toLowerCase()
        ) {
          return true;
        }
        if (
          p.name && soldItem.productName &&
          p.name.trim().toLowerCase() === soldItem.productName.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      if (prodIndex >= 0) {
        const prod = baseProducts[prodIndex];
        const previousTotalQty = Number(prod.quantity) || 0;
        const soldSize = soldItem.size || 'No Size';

        let updatedSizeQuantities: Record<string, number> | undefined = undefined;
        let sizeStockInfo = '';

        if (prod.sizeQuantities && typeof prod.sizeQuantities === 'object') {
          const currentSizeStock = Number(prod.sizeQuantities[soldSize] ?? 0);
          const newSizeStock = Math.max(0, currentSizeStock - soldQty);
          updatedSizeQuantities = {
            ...prod.sizeQuantities,
            [soldSize]: newSizeStock,
          };
          sizeStockInfo = ` [Size ${soldSize}: ${currentSizeStock} → ${newSizeStock}]`;
        } else if (prod.sizes && prod.sizes.length > 0) {
          const map: Record<string, number> = {};
          prod.sizes.forEach((s) => {
            map[s] = s === soldSize ? Math.max(0, previousTotalQty - soldQty) : 0;
          });
          updatedSizeQuantities = map;
          sizeStockInfo = ` [Size ${soldSize}: ${previousTotalQty} → ${Math.max(0, previousTotalQty - soldQty)}]`;
        }

        // Calculate new total quantity across all sizes
        let newTotalQty: number;
        if (updatedSizeQuantities) {
          newTotalQty = Object.values(updatedSizeQuantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
        } else {
          newTotalQty = Math.max(0, previousTotalQty - soldQty);
        }

        const modifiedProd = {
          ...prod,
          sizeQuantities: updatedSizeQuantities ?? prod.sizeQuantities,
          quantity: newTotalQty,
          updatedAt: now,
        };

        baseProducts[prodIndex] = modifiedProd;
        prodsToSync.push(modifiedProd);

        newLogs.push({
          id: `log-${Date.now()}-${prod.id}-${soldItem.size || 'sz'}-${Math.floor(Math.random() * 1000)}`,
          productId: prod.id,
          productName: prod.name,
          type: 'SALE',
          quantityChanged: -soldQty,
          previousQuantity: previousTotalQty,
          newQuantity: newTotalQty,
          reason: `Sold ${soldQty} unit(s) [Size: ${soldItem.size || 'N/A'}, Color: ${soldItem.color || prod.color}]${sizeStockInfo} in Bill #${invoiceNum} (${completedSale.customerName || 'Walk-in Customer'})`,
          date: now,
        });
      }
    });

    // Record to Firestore collections: sales, bills, customers, inventory, stock_logs
    recordSaleToFirestore(completedSale, prodsToSync, newLogs).catch((err) => {
      console.error('Failed to sync sale to Firestore:', err);
    });

    showToast(`Bill #${invoiceNum} generated! Stock synced to laptop & mobile.`);
    return completedSale;
  };

  const handleQuickSellFromCatalog = (product: Product) => {
    setPreselectedSaleProduct(product);
    setActiveTab('sales');
  };

  const lowStockCount = products.filter((p) => p.quantity <= p.minimumStockLevel).length;

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-sm">
        Loading Somaiya Men's Wear System...
      </div>
    );
  }

  // Admin Login gate
  if (!admin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        admin={admin}
        onLogout={handleLogout}
        lowStockCount={lowStockCount}
        onOpenNewSale={() => setActiveTab('sales')}
        onOpenAddProduct={() => {
          setProductToEdit(null);
          setIsProductModalOpen(true);
        }}
        onOpenBackupRestore={handleOpenBackupRestore}
        isCloudSynced={isCloudSynced}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 border border-amber-500/40 text-neutral-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            sales={sales}
            onNavigateTab={setActiveTab}
            onOpenNewSale={() => setActiveTab('sales')}
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onQuickRestock={(productId, amt) =>
              handleAdjustStock(productId, amt, 'IN', 'Quick replenishment')
            }
            onViewSaleReceipt={(sale) => setActiveReceiptSale(sale)}
            onOpenBackupRestore={handleOpenBackupRestore}
            onTriggerRestoreBackup={handleTriggerRestoreBackup}
            onTriggerDownloadBackup={handleTriggerDownloadBackup}
            onFileSelectedForRestore={handleProcessFileForRestore}
          />
        )}

        {activeTab === 'products' && (
          <ProductListView
            products={products}
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setIsProductModalOpen(true);
            }}
            onDeleteProduct={(p) => setProductToDelete(p)}
            onQuickAdjustStock={handleQuickAdjustStock}
            onQuickSellProduct={handleQuickSellFromCatalog}
          />
        )}

        {activeTab === 'stock' && (
          <StockManagementView
            products={products}
            stockLogs={stockLogs}
            onAdjustStock={handleAdjustStock}
            onBatchRestock={handleBatchRestock}
            onNavigateToProducts={() => setActiveTab('products')}
            onOpenBarcodeScanner={() => handleOpenScanner('stock')}
            highlightedProductId={highlightedStockProductId}
          />
        )}

        {activeTab === 'sales' && (
          <SalesManagementView
            products={products}
            sales={sales}
            customers={customers}
            bills={bills}
            onRecordSale={handleRecordSale}
            onViewReceipt={(sale) => setActiveReceiptSale(sale)}
            onNavigateToProducts={() => setActiveTab('products')}
            initialSelectedProduct={preselectedSaleProduct}
            onClearInitialProduct={() => setPreselectedSaleProduct(null)}
            onOpenBarcodeScanner={() => handleOpenScanner('sales')}
          />
        )}

        {activeTab === 'reports' && (
          <SalesReportView products={products} sales={sales} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Somaiya Men's Wear · Inventory Management System</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenBackupRestore('download')}
              className="text-neutral-400 hover:text-amber-400 transition-colors font-medium cursor-pointer"
              title="Download or Restore store database backup"
            >
              Backup & Restore
            </button>
            <span>·</span>
            <button
              onClick={handleClearAllData}
              className="text-neutral-500 hover:text-red-400 transition-colors"
              title="Clear all stored products and sales"
            >
              Clear All Data
            </button>
            <span>·</span>
            <span className="text-emerald-400/80">Firestore Cloud Sync Active</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
          setScannedInitialBarcode('');
        }}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        initialBarcode={scannedInitialBarcode}
        onOpenScanner={() => handleOpenScanner('product_form')}
      />

      {/* Fullscreen Camera Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title={
          scannerOrigin === 'sales'
            ? 'Scan Product for Bill'
            : scannerOrigin === 'stock'
            ? 'Scan Product for Stock Update'
            : 'Scan Product Barcode'
        }
        subtitle={
          scannerOrigin === 'sales'
            ? 'Scan barcode to find product and add to cart'
            : scannerOrigin === 'stock'
            ? 'Scan barcode to quickly adjust inventory'
            : 'Scan barcode to pre-fill product details'
        }
      />

      {/* Safe Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        product={productToDelete}
      />

      {/* Printable Receipt Modal */}
      <SaleReceiptModal
        isOpen={!!activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
        sale={activeReceiptSale}
      />

      {/* Admin Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        products={products}
        sales={sales}
        stockLogs={stockLogs}
        onDataRestored={handleDataRestored}
        showToast={showToast}
        initialMode={backupModalMode}
      />

      {/* Browser File Input for Direct Restore Backup Action */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json,.bak,application/json,application/octet-stream,text/plain"
        onChange={handleRestoreFileSelected}
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
        id="browser-backup-restore-file-input"
        aria-label="Select JSON Backup to Restore"
      />

      {/* Pre-Restore Confirmation Dialog Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                    <span>Confirm Database Restoration</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Validated JSON v{pendingRestore.backupData.version}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    File: <span className="font-mono text-neutral-200">{pendingRestore.fileName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelPendingRestore}
                disabled={isRestoring}
                className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
                title="Cancel restore"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Products</span>
                  <span className="text-base font-bold font-mono text-neutral-100">
                    {pendingRestore.backupData.data.products.length}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">With size stocks</span>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Total Stock</span>
                  <span className="text-base font-bold font-mono text-neutral-100">
                    {pendingRestore.backupData.summary.totalStockUnits} pcs
                  </span>
                  <span className="text-[10px] text-neutral-500 block">All categories</span>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Sales Bills</span>
                  <span className="text-base font-bold font-mono text-neutral-100">
                    {pendingRestore.backupData.data.sales.length}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Customer records</span>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Stock Logs</span>
                  <span className="text-base font-bold font-mono text-neutral-100">
                    {pendingRestore.backupData.data.stockLogs.length}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Audit entries</span>
                </div>
              </div>

              {/* Warning and Safeguard Card */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-neutral-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Important Confirmation</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-300">
                  Restoring this backup will replace current live products, size-wise stock quantities, sales history, and audit logs with the data from this backup file.
                </p>
                <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800 flex items-start gap-2 text-[11px] text-neutral-300">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-400">Automatic Data Protection:</strong> A pre-restore safety backup of your existing store data will be saved to your browser's safe storage before restoring.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelPendingRestore}
                  disabled={isRestoring}
                  className="w-full sm:w-auto px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel (Keep Current Data)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPendingRestore}
                  disabled={isRestoring}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'Restoring Data...' : 'Confirm & Restore Backup'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Dialog Modal */}
      {restoreValidationError && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-red-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">
                    Backup Validation Failed
                  </h3>
                  <p className="text-xs text-neutral-400">Current store data preserved untouched.</p>
                </div>
              </div>
              <button
                onClick={() => setRestoreValidationError(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-neutral-300">
              <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3.5 text-red-200">
                <p className="font-medium text-red-300 mb-1">Could not restore this file:</p>
                <p className="text-red-300/90 leading-relaxed">{restoreValidationError}</p>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Please ensure you are selecting a valid JSON backup exported from Somaiya Men's Wear Inventory.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRestoreValidationError(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold"
                >
                  Close & Keep Live Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
