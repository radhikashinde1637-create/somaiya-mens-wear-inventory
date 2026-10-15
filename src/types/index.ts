export type ProductCategory =
  | 'Formal Shirts'
  | 'Casual Shirts'
  | 'T-Shirts & Polos'
  | 'Jeans'
  | 'Trousers'
  | 'Formal Pants'
  | 'Blazers & Suits'
  | 'Kurta & Ethnic Wear'
  | 'Accessories';

export const SHIRT_SIZES = ['M', 'L', 'XL', 'XXL'] as const;
export const PANT_SIZES = ['30', '32', '34', '36', '38'] as const;
export const NO_SIZE = 'No Size' as const;
export const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL', '30', '32', '34', '36', '38', 'No Size'] as const;
export type ClothingSize = (typeof AVAILABLE_SIZES)[number];

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string; // Barcode scanned via camera scanner (EAN, UPC, Code128, QR, etc.)
  category: ProductCategory | string;
  sizes: string[]; // Multiple sizes e.g. ['M', 'L', 'XL', 'XXL']
  size?: string; // Fallback or joined string
  sizeQuantities?: Record<string, number>; // Size-wise stock quantities e.g. { 'M': 100, 'L': 150, 'XL': 170, 'XXL': 120 }
  color: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number; // Combined total quantity across all selected sizes
  minimumStockLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  size: string; // The specific size sold (e.g. 'L' or selected size)
  color: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card';

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type StockLogType = 'IN' | 'OUT' | 'ADJUST' | 'SALE';

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: StockLogType;
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  date: string;
}

export interface AdminUser {
  username: string;
  name: string;
  role: 'Store Admin';
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  totalPurchases: number;
  totalBills: number;
  lastPurchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export type ActiveTab = 'dashboard' | 'products' | 'stock' | 'sales' | 'reports';

export interface StoreBackupData {
  appName: string;
  version: string;
  exportTimestamp: string;
  exportDateFormatted: string;
  summary: {
    totalProducts: number;
    totalStockUnits: number;
    totalSales: number;
    totalStockLogs: number;
  };
  data: {
    products: Product[];
    sales: Sale[];
    stockLogs: StockLog[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  backupData?: StoreBackupData;
  warnings?: string[];
}
