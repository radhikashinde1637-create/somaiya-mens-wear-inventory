import React, { useState } from 'react';
import { ActiveTab, AdminUser } from '../types';
import {
  LayoutDashboard,
  Package,
  Layers,
  Receipt,
  BarChart3,
  Plus,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Shield,
  Database,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  admin: AdminUser;
  onLogout: () => void;
  lowStockCount: number;
  onOpenNewSale: () => void;
  onOpenAddProduct: () => void;
  onOpenBackupRestore?: (mode?: 'download' | 'restore') => void;
  isCloudSynced?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  admin,
  onLogout,
  lowStockCount,
  onOpenNewSale,
  onOpenAddProduct,
  onOpenBackupRestore,
  isCloudSynced = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'stock', label: 'Stock Management', icon: <Layers className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales & Billing', icon: <Receipt className="w-4 h-4" /> },
    { id: 'reports', label: 'Sales Report', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="font-brand text-lg sm:text-xl font-bold tracking-tight text-neutral-100 group-hover:text-amber-400 transition-colors">
                Somaiya Men's Wear
              </span>
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-neutral-400 border-l border-neutral-700 pl-3">
              Inventory & POS
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'stock' && lowStockCount > 0 && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions & Admin Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Firestore Cloud Sync Badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                isCloudSynced
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
              }`}
              title="Firebase Firestore realtime database active. Laptop and mobile devices sync immediately."
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden xl:inline">{isCloudSynced ? 'Firestore Live Sync' : 'Connecting...'}</span>
              <span className="xl:hidden">{isCloudSynced ? 'Live Sync' : 'Syncing'}</span>
            </div>

            {/* Low stock alert indicator */}
            {lowStockCount > 0 && (
              <button
                onClick={() => onTabChange('stock')}
                title={`${lowStockCount} items below Minimum Stock Level`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="tabular-nums font-mono">{lowStockCount}</span>
                <span className="hidden xl:inline">Low Stock</span>
              </button>
            )}

            {/* Quick Action: New Sale */}
            <button
              onClick={onOpenNewSale}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>

            {/* Quick Action: Add Product */}
            <button
              onClick={onOpenAddProduct}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>

            {/* Admin Profile & Actions */}
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-neutral-800 text-xs">
              <button
                onClick={() => onOpenBackupRestore?.('download')}
                title="Download or Restore Store Data Backup"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 rounded-lg border border-amber-500/30 transition-colors font-medium shadow-sm cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Backup & Restore</span>
              </button>

              <div className="text-right pl-1">
                <div className="flex items-center gap-1 justify-end font-medium text-neutral-200 leading-tight">
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Admin</span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono">@{admin.username}</p>
              </div>
              <button
                onClick={onLogout}
                title="Logout of Admin session"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-red-400 hover:bg-neutral-800 active:bg-neutral-850 rounded-lg border border-neutral-750 transition-colors font-medium shadow-sm cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-400" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 lg:hidden text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-800 bg-neutral-900 px-4 pt-3 pb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-neutral-800">
            <button
              onClick={() => {
                onOpenNewSale();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg"
            >
              <Receipt className="w-4 h-4" />
              <span>New Sale</span>
            </button>
            <button
              onClick={() => {
                onOpenAddProduct();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-neutral-800 text-amber-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'stock' && lowStockCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 rounded">
                      {lowStockCount} Low
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Cloud Sync Status */}
          <div className="pt-1">
            <div
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border ${
                isCloudSynced
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{isCloudSynced ? 'Firestore Cloud Active' : 'Connecting to Firestore...'}</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Mobile & Laptop Sync</span>
            </div>
          </div>

          {/* Mobile Backup & Restore Quick Action */}
          <div className="pt-1">
            <button
              onClick={() => {
                onOpenBackupRestore?.('download');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Backup & Restore Store Data</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">Admin</span>
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-medium text-neutral-300 flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Store Admin</span>
              </span>
              <span className="text-neutral-500 block text-[10px] font-mono">@{admin.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 bg-neutral-800 rounded-lg border border-neutral-700 hover:bg-neutral-750"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
