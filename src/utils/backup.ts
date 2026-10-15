import { Product, Sale, StockLog, StoreBackupData, BackupValidationResult } from '../types';
import { saveStoredProducts, saveStoredSales, saveStoredStockLogs, formatDateTime } from './storage';

export const CURRENT_BACKUP_VERSION = '2.0.0';
export const APP_IDENTIFIER = "Somaiya Men's Wear Inventory & POS";
const SAFETY_BACKUP_STORAGE_KEY = 'somaiya_last_safety_backup_v2';

/**
 * Creates a structured, versioned backup object from current app state
 */
export function createBackupPayload(
  products: Product[],
  sales: Sale[],
  stockLogs: StockLog[]
): StoreBackupData {
  const now = new Date();
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);

  return {
    appName: APP_IDENTIFIER,
    version: CURRENT_BACKUP_VERSION,
    exportTimestamp: now.toISOString(),
    exportDateFormatted: formatDateTime(now.toISOString()),
    summary: {
      totalProducts: products.length,
      totalStockUnits,
      totalSales: sales.length,
      totalStockLogs: stockLogs.length,
    },
    data: {
      // Deep clone to prevent any external mutation
      products: JSON.parse(JSON.stringify(products)),
      sales: JSON.parse(JSON.stringify(sales)),
      stockLogs: JSON.parse(JSON.stringify(stockLogs)),
    },
  };
}

/**
 * Initiates browser download of a dated backup file without launching external editors like VS Code.
 * - Uses 'application/octet-stream' binary MIME type so the browser treats the file as a direct disk download,
 *   preventing browsers from auto-opening the file in Visual Studio Code or other registered editor associations.
 * - Sets download, rel, and target attributes cleanly.
 * - Supports both standard '.json' and safe archive '.bak' formats.
 */
export function downloadBackupFile(
  backupData: StoreBackupData,
  filenamePrefix = 'somaiya-menswear-backup',
  extension: 'json' | 'bak' = 'json'
): string {
  const d = new Date(backupData.exportTimestamp || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const filename = `${filenamePrefix}-${year}${month}${day}-${hours}${minutes}${seconds}.${extension}`;
  const jsonString = JSON.stringify(backupData, null, 2);

  // Using 'application/octet-stream' forces the browser to treat this as an attachment save,
  // preventing browsers with file association handlers from launching VS Code upon download.
  const blob = new Blob([jsonString], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.setAttribute('target', '_self');
  anchor.setAttribute('rel', 'noopener noreferrer');

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Asynchronous cleanup so the browser initiates download stream safely
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 3000);

  return filename;
}

/**
 * Copies the full backup JSON payload directly to the clipboard so the user
 * can preserve their data without downloading files or opening VS Code.
 */
export async function copyBackupToClipboard(backupData: StoreBackupData): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(backupData, null, 2);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonString);
      return true;
    } else {
      // Fallback for older environments
      const textarea = document.createElement('textarea');
      textarea.value = jsonString;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error('Failed copying backup to clipboard:', err);
    return false;
  }
}

/**
 * Validates an uploaded JSON backup file content
 */
export function validateBackupFileContent(rawText: string): BackupValidationResult {
  if (!rawText || !rawText.trim()) {
    return {
      isValid: false,
      error: 'The uploaded file is empty. Please select a valid JSON backup file.',
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err: any) {
    return {
      isValid: false,
      error: `Invalid JSON syntax: ${err?.message || 'Failed to parse file.'}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: 'Invalid backup format. Backup must be a JSON object.',
    };
  }

  // Handle both standard nested structure { data: { products, sales, stockLogs } }
  // and flat structure { products, sales, stockLogs } for resilience
  let products: any[] = [];
  let sales: any[] = [];
  let stockLogs: any[] = [];

  if (parsed.data && typeof parsed.data === 'object') {
    products = Array.isArray(parsed.data.products) ? parsed.data.products : [];
    sales = Array.isArray(parsed.data.sales) ? parsed.data.sales : [];
    stockLogs = Array.isArray(parsed.data.stockLogs) ? parsed.data.stockLogs : [];
  } else {
    // Fallback if exported directly without .data wrapper
    if (Array.isArray(parsed.products)) products = parsed.products;
    if (Array.isArray(parsed.sales)) sales = parsed.sales;
    if (Array.isArray(parsed.stockLogs)) stockLogs = parsed.stockLogs;
  }

  const warnings: string[] = [];

  // Validate Products Structure
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p || typeof p !== 'object') {
      return {
        isValid: false,
        error: `Product at index ${i} is corrupted or not an object.`,
      };
    }
    if (!p.id || !p.name) {
      return {
        isValid: false,
        error: `Product at index ${i} is missing required fields (id, name).`,
      };
    }

    // Ensure sizeQuantities is safely handled
    if (!p.sizeQuantities || typeof p.sizeQuantities !== 'object') {
      p.sizeQuantities = {};
    }
  }

  // Validate Sales Structure
  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    if (!s || typeof s !== 'object') {
      return {
        isValid: false,
        error: `Sale record at index ${i} is corrupted or not an object.`,
      };
    }
    if (!s.id || !s.invoiceNumber || !Array.isArray(s.items)) {
      return {
        isValid: false,
        error: `Sale record at index ${i} is missing invoice number or item list.`,
      };
    }
  }

  // Validate Stock Logs Structure
  for (let i = 0; i < stockLogs.length; i++) {
    const l = stockLogs[i];
    if (!l || typeof l !== 'object') {
      return {
        isValid: false,
        error: `Stock log at index ${i} is corrupted or not an object.`,
      };
    }
  }

  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);

  const normalizedBackup: StoreBackupData = {
    appName: parsed.appName || APP_IDENTIFIER,
    version: parsed.version || '1.0.0',
    exportTimestamp: parsed.exportTimestamp || new Date().toISOString(),
    exportDateFormatted: parsed.exportDateFormatted || formatDateTime(new Date().toISOString()),
    summary: {
      totalProducts: products.length,
      totalStockUnits,
      totalSales: sales.length,
      totalStockLogs: stockLogs.length,
    },
    data: {
      products,
      sales,
      stockLogs,
    },
  };

  return {
    isValid: true,
    backupData: normalizedBackup,
    warnings,
  };
}

/**
 * Automatically creates a safety backup of existing live data before any restore.
 * Safely saves to local fallback storage without triggering external editors or unwanted downloads.
 */
export function createPreRestoreSafetyBackup(
  currentProducts: Product[],
  currentSales: Sale[],
  currentStockLogs: StockLog[],
  downloadFile = false
): { filename?: string; safetyData: StoreBackupData } {
  const safetyData = createBackupPayload(currentProducts, currentSales, currentStockLogs);

  // Store in fallback localStorage safety key
  try {
    localStorage.setItem(SAFETY_BACKUP_STORAGE_KEY, JSON.stringify(safetyData));
  } catch (err) {
    console.warn('Could not cache safety backup to localStorage:', err);
  }

  let filename: string | undefined = undefined;
  if (downloadFile) {
    filename = downloadBackupFile(
      safetyData,
      'somaiya-PRE-RESTORE-AUTOMATIC-SAFETY-BACKUP'
    );
  }

  return { filename, safetyData };
}

/**
 * Safely writes restored data to localStorage
 */
export function restoreBackupToStorage(backup: StoreBackupData): boolean {
  try {
    saveStoredProducts(backup.data.products);
    saveStoredSales(backup.data.sales);
    saveStoredStockLogs(backup.data.stockLogs);
    return true;
  } catch (err) {
    console.error('Error restoring data to storage:', err);
    return false;
  }
}

export interface VaultSnapshot {
  id: string;
  name: string;
  timestamp: string;
  formattedDate: string;
  summary: {
    totalProducts: number;
    totalStockUnits: number;
    totalSales: number;
    totalStockLogs: number;
  };
  data: StoreBackupData;
}

const VAULT_STORAGE_KEY = 'somaiya_browser_vault_snapshots_v1';

export function getVaultSnapshots(): VaultSnapshot[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVaultSnapshot(backupData: StoreBackupData, name?: string): VaultSnapshot {
  const snapshots = getVaultSnapshots();
  const snapshot: VaultSnapshot = {
    id: `snap_${Date.now()}`,
    name: name || `Snapshot ${snapshots.length + 1}`,
    timestamp: backupData.exportTimestamp,
    formattedDate: backupData.exportDateFormatted,
    summary: backupData.summary,
    data: backupData,
  };
  const updated = [snapshot, ...snapshots].slice(0, 10);
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save vault snapshot to localStorage:', e);
  }
  return snapshot;
}

export function deleteVaultSnapshot(id: string): void {
  const snapshots = getVaultSnapshots();
  const updated = snapshots.filter((s) => s.id !== id);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
}

