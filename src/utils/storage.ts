import { Product, Sale, StockLog, AdminUser } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'somaiya_products_live_v2',
  SALES: 'somaiya_sales_live_v2',
  STOCK_LOGS: 'somaiya_stock_logs_live_v2',
  ADMIN_SESSION: 'somaiya_admin_session_v2',
  ADMIN_CREDENTIALS: 'somaiya_admin_credentials_v2',
};

// Default Admin credentials
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'Somaiya@2026',
  name: 'Store Administrator',
};

// Initialize empty storage
export function initStorage(): void {
  try {
    // Clear legacy mock versions if present
    localStorage.removeItem('somaiya_menswear_products_v1');
    localStorage.removeItem('somaiya_menswear_sales_v1');
    localStorage.removeItem('somaiya_menswear_stock_logs_v1');
    localStorage.removeItem('somaiya_menswear_user_v1');

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    }
    // Always store active admin credentials
    localStorage.setItem(STORAGE_KEYS.ADMIN_CREDENTIALS, JSON.stringify(DEFAULT_ADMIN));
  } catch (err) {
    console.error('Storage initialization error:', err);
  }
}

// Admin Auth
export function getStoredAdmin(): AdminUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: AdminUser | null): void {
  try {
    if (admin) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(admin));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  } catch (err) {
    console.error('Error saving admin session:', err);
  }
}

export function verifyAdminCredentials(username: string, password: string): AdminUser | null {
  try {
    const credsJson = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDENTIALS);
    const creds = credsJson ? JSON.parse(credsJson) : DEFAULT_ADMIN;

    if (username.trim() === creds.username && password.trim() === creds.password) {
      return {
        username: creds.username,
        name: creds.name || 'Store Administrator',
        role: 'Store Admin',
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Products
export function getStoredProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

// Sales
export function getStoredSales(): Sale[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStoredSales(sales: Sale[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (err) {
    console.error('Error saving sales:', err);
  }
}

// Stock Movement Logs
export function getStoredStockLogs(): StockLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStoredStockLogs(logs: StockLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving stock logs:', err);
  }
}

// Clear all data (empty reset for fresh start)
export function clearAllStoreData(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
  } catch (err) {
    console.error('Error resetting store data:', err);
  }
}

// Currency Formatter
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Date Formatter
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

// DateTime Formatter
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// Robust extractor for product sizes supporting arrays, comma-strings, and custom sizes
export function getProductSizesList(product: { sizes?: string[]; size?: string }): string[] {
  const result: string[] = [];
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    for (const item of product.sizes) {
      if (typeof item === 'string') {
        const parts = item
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        result.push(...parts);
      }
    }
  }
  if (result.length === 0 && product.size) {
    const parts = product.size
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    result.push(...parts);
  }
  const unique = Array.from(new Set(result));
  return unique.length > 0 ? unique : ['No Size'];
}

/**
 * Returns available stock for a specific size of a product.
 * If sizeQuantities breakdown is recorded, returns that size's stock.
 * Otherwise falls back to total product quantity.
 */
export function getProductSizeStock(product: Product, size: string): number {
  if (product.sizeQuantities && typeof product.sizeQuantities[size] === 'number') {
    return Math.max(0, Number(product.sizeQuantities[size]) || 0);
  }
  // If product doesn't have sizeQuantities breakdown yet (legacy data):
  const sizes = getProductSizesList(product);
  if (sizes.length <= 1 || size === 'No Size') {
    return Math.max(0, Number(product.quantity) || 0);
  }
  return Math.max(0, Number(product.quantity) || 0);
}
