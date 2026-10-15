import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { Product, Sale, StockLog, Customer, Bill, StoreBackupData } from '../types';
import {
  getStoredProducts,
  getStoredSales,
  getStoredStockLogs,
} from '../utils/storage';

export const COLLECTIONS = {
  INVENTORY: 'inventory',
  SALES: 'sales',
  CUSTOMERS: 'customers',
  BILLS: 'bills',
  STOCK_LOGS: 'stock_logs',
} as const;

/**
 * Sanitizes object data for Firestore by removing undefined values and ensuring JSON serializability.
 */
function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

// ----------------------------------------------------
// Realtime Subscriptions via onSnapshot
// ----------------------------------------------------

/**
 * Realtime sync for inventory products
 */
export function subscribeToInventory(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.INVENTORY);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as Product),
          id: docSnap.id,
        });
      });
      // Sort newest created first, fallback by name
      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore inventory onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Realtime sync for sales transactions
 */
export function subscribeToSales(
  onUpdate: (sales: Sale[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.SALES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as Sale),
          id: docSnap.id,
        });
      });
      // Sort newest sales first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore sales onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Realtime sync for customers
 */
export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as Customer),
          id: docSnap.id,
        });
      });
      items.sort((a, b) => new Date(b.lastPurchaseDate || 0).getTime() - new Date(a.lastPurchaseDate || 0).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore customers onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Realtime sync for bills / invoices
 */
export function subscribeToBills(
  onUpdate: (bills: Bill[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.BILLS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Bill[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as Bill),
          id: docSnap.id,
        });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore bills onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Realtime sync for stock logs
 */
export function subscribeToStockLogs(
  onUpdate: (logs: StockLog[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.STOCK_LOGS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: StockLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as StockLog),
          id: docSnap.id,
        });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore stock_logs onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// ----------------------------------------------------
// Firestore Mutations & Write Operations
// ----------------------------------------------------

/**
 * Save or update a product in 'inventory' collection
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, product.id);
  const sanitized = sanitizeForFirestore(product);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Delete a product from 'inventory' collection
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVENTORY, productId);
  await deleteDoc(docRef);
}

/**
 * Batch update products in 'inventory' collection
 */
export async function batchSaveProductsToFirestore(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  const batch = writeBatch(db);
  for (const product of products) {
    const docRef = doc(db, COLLECTIONS.INVENTORY, product.id);
    batch.set(docRef, sanitizeForFirestore(product), { merge: true });
  }
  await batch.commit();
}

/**
 * Record a sale:
 * 1. Creates document in 'sales'
 * 2. Creates document in 'bills'
 * 3. Updates/creates document in 'customers'
 * 4. Updates inventory products
 * 5. Records stock_logs
 */
export async function recordSaleToFirestore(
  sale: Sale,
  updatedProducts: Product[],
  stockLogs: StockLog[]
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Write to 'sales'
  const saleRef = doc(db, COLLECTIONS.SALES, sale.id);
  batch.set(saleRef, sanitizeForFirestore(sale));

  // 2. Write to 'bills'
  const billData: Bill = {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    customerName: sale.customerName || 'Walk-in Customer',
    customerPhone: sale.customerPhone || '',
    items: sale.items,
    subtotal: sale.subtotal,
    discount: sale.discount,
    totalAmount: sale.totalAmount,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes || '',
    createdAt: sale.date,
  };
  const billRef = doc(db, COLLECTIONS.BILLS, sale.id);
  batch.set(billRef, sanitizeForFirestore(billData));

  // 3. Write or update customer if info provided
  const custName = (sale.customerName || '').trim();
  const custPhone = (sale.customerPhone || '').trim();
  if (custName || custPhone) {
    const customerKey = custPhone || custName.toLowerCase().replace(/\s+/g, '_');
    const customerId = `cust-${customerKey}`;
    const customerRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);

    const customerRecord: Customer = {
      id: customerId,
      name: custName || 'Walk-in Customer',
      phone: custPhone,
      totalPurchases: sale.totalAmount,
      totalBills: 1,
      lastPurchaseDate: sale.date,
      createdAt: sale.date,
      updatedAt: sale.date,
    };
    batch.set(customerRef, sanitizeForFirestore(customerRecord), { merge: true });
  }

  // 4. Update products in 'inventory'
  for (const prod of updatedProducts) {
    const prodRef = doc(db, COLLECTIONS.INVENTORY, prod.id);
    batch.set(prodRef, sanitizeForFirestore(prod), { merge: true });
  }

  // 5. Add stock logs
  for (const log of stockLogs) {
    const logRef = doc(db, COLLECTIONS.STOCK_LOGS, log.id);
    batch.set(logRef, sanitizeForFirestore(log));
  }

  await batch.commit();
}

/**
 * Save single stock log
 */
export async function saveStockLogToFirestore(log: StockLog): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STOCK_LOGS, log.id);
  await setDoc(docRef, sanitizeForFirestore(log));
}

/**
 * Batch save stock logs
 */
export async function batchSaveStockLogsToFirestore(logs: StockLog[]): Promise<void> {
  if (logs.length === 0) return;
  const batch = writeBatch(db);
  for (const log of logs) {
    const docRef = doc(db, COLLECTIONS.STOCK_LOGS, log.id);
    batch.set(docRef, sanitizeForFirestore(log));
  }
  await batch.commit();
}

/**
 * Clear all data from all collections (admin action)
 */
export async function clearAllFirestoreData(): Promise<void> {
  const collectionsToClear = [
    COLLECTIONS.INVENTORY,
    COLLECTIONS.SALES,
    COLLECTIONS.CUSTOMERS,
    COLLECTIONS.BILLS,
    COLLECTIONS.STOCK_LOGS,
  ];

  for (const colName of collectionsToClear) {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

/**
 * Restore an entire backup payload directly into Firestore
 */
export async function restoreBackupToFirestore(backupData: StoreBackupData): Promise<boolean> {
  try {
    const { products, sales, stockLogs } = backupData.data;

    // 1. Batch save products to 'inventory'
    if (products && products.length > 0) {
      await batchSaveProductsToFirestore(products);
    }

    // 2. Batch save sales to 'sales' and 'bills'
    if (sales && sales.length > 0) {
      const batch = writeBatch(db);
      for (const sale of sales) {
        const saleRef = doc(db, COLLECTIONS.SALES, sale.id);
        batch.set(saleRef, sanitizeForFirestore(sale));

        const billRef = doc(db, COLLECTIONS.BILLS, sale.id);
        const billData: Bill = {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customerName: sale.customerName || 'Walk-in Customer',
          customerPhone: sale.customerPhone || '',
          items: sale.items,
          subtotal: sale.subtotal,
          discount: sale.discount,
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes || '',
          createdAt: sale.date,
        };
        batch.set(billRef, sanitizeForFirestore(billData));
      }
      await batch.commit();
    }

    // 3. Batch save stock logs to 'stock_logs'
    if (stockLogs && stockLogs.length > 0) {
      await batchSaveStockLogsToFirestore(stockLogs);
    }

    return true;
  } catch (err) {
    console.error('Error restoring backup to Firestore:', err);
    return false;
  }
}

/**
 * Check if Firestore is completely empty (no inventory).
 * If Firestore is empty and local storage has existing products,
 * automatically upload local data to Firestore so data is shared with mobile and laptop ("no more 0 issue").
 */
export async function autoMigrateLocalStorageToFirestore(): Promise<{
  migrated: boolean;
  productCount: number;
}> {
  try {
    const invSnap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
    if (!invSnap.empty) {
      // Already has data in Firestore, no migration needed
      return { migrated: false, productCount: invSnap.size };
    }

    // Check localStorage
    const localProducts = getStoredProducts();
    const localSales = getStoredSales();
    const localLogs = getStoredStockLogs();

    if (localProducts.length > 0 || localSales.length > 0) {
      console.log('Migrating local store data to Firestore...');
      if (localProducts.length > 0) {
        await batchSaveProductsToFirestore(localProducts);
      }
      if (localSales.length > 0) {
        const batch = writeBatch(db);
        for (const s of localSales) {
          batch.set(doc(db, COLLECTIONS.SALES, s.id), sanitizeForFirestore(s));
          batch.set(doc(db, COLLECTIONS.BILLS, s.id), sanitizeForFirestore({
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            date: s.date,
            customerName: s.customerName || 'Walk-in Customer',
            customerPhone: s.customerPhone || '',
            items: s.items,
            subtotal: s.subtotal,
            discount: s.discount,
            totalAmount: s.totalAmount,
            paymentMethod: s.paymentMethod,
            notes: s.notes || '',
            createdAt: s.date,
          }));
        }
        await batch.commit();
      }
      if (localLogs.length > 0) {
        await batchSaveStockLogsToFirestore(localLogs);
      }
      return { migrated: true, productCount: localProducts.length };
    }

    return { migrated: false, productCount: 0 };
  } catch (err) {
    console.warn('Auto migration check skipped or failed:', err);
    return { migrated: false, productCount: 0 };
  }
}
