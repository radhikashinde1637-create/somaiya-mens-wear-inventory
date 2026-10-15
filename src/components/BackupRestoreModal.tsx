import React, { useState, useEffect, useRef } from 'react';
import { Product, Sale, StockLog, StoreBackupData, BackupValidationResult } from '../types';
import {
  createBackupPayload,
  downloadBackupFile,
  validateBackupFileContent,
  createPreRestoreSafetyBackup,
  restoreBackupToStorage,
  copyBackupToClipboard,
  getVaultSnapshots,
  saveVaultSnapshot,
  deleteVaultSnapshot,
  VaultSnapshot,
  CURRENT_BACKUP_VERSION,
} from '../utils/backup';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Shield,
  RotateCcw,
  Database,
  ArrowRight,
  Clock,
  Package,
  Receipt,
  Layers,
  Info,
  Copy,
  Check,
  Code,
  Eye,
  EyeOff,
  Save,
  Trash2,
  FileCheck,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sales: Sale[];
  stockLogs: StockLog[];
  onDataRestored: (newProducts: Product[], newSales: Sale[], newStockLogs: StockLog[]) => void;
  showToast: (msg: string) => void;
  initialMode?: 'download' | 'restore';
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  stockLogs,
  onDataRestored,
  showToast,
  initialMode = 'download',
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'restore'>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [safetyBackupDownloaded, setSafetyBackupDownloaded] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showInAppPreview, setShowInAppPreview] = useState(false);
  const [vaultSnapshots, setVaultSnapshots] = useState<VaultSnapshot[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setSelectedFile(null);
      setValidationResult(null);
      setShowConfirmRestore(false);
      setSafetyBackupDownloaded(null);
      setIsCopied(false);
      setShowInAppPreview(false);
      setVaultSnapshots(getVaultSnapshots());
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const currentBackupPayload = createBackupPayload(products, sales, stockLogs);

  // Handle Download Backup (.json or .bak)
  const handleDownload = (extension: 'json' | 'bak' = 'json') => {
    try {
      setIsProcessing(true);
      const filename = downloadBackupFile(currentBackupPayload, 'somaiya-menswear-backup', extension);
      showToast(
        `Backup saved to Downloads: ${filename} (Direct download, not opened in VS Code)`
      );
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Copy Backup to Clipboard
  const handleCopyClipboard = async () => {
    const success = await copyBackupToClipboard(currentBackupPayload);
    if (success) {
      setIsCopied(true);
      showToast('Full backup JSON copied to clipboard! (No external editor needed)');
      setTimeout(() => setIsCopied(false), 3000);
    } else {
      alert('Could not copy to clipboard. Please use the Download Backup button.');
    }
  };

  // Handle Save In-Browser Vault Snapshot
  const handleSaveToVault = () => {
    const snap = saveVaultSnapshot(currentBackupPayload);
    setVaultSnapshots(getVaultSnapshots());
    showToast(`Saved snapshot "${snap.name}" to in-browser safe vault!`);
  };

  // Handle Delete Vault Snapshot
  const handleDeleteSnapshot = (id: string) => {
    deleteVaultSnapshot(id);
    setVaultSnapshots(getVaultSnapshots());
  };

  // Handle Restore from Vault Snapshot
  const handleRestoreFromSnapshot = (snap: VaultSnapshot) => {
    const result = validateBackupFileContent(JSON.stringify(snap.data));
    setValidationResult(result);
    setSelectedFile(new File([JSON.stringify(snap.data)], `${snap.name}.json`, { type: 'application/json' }));
    setActiveTab('restore');
    if (result.isValid) {
      setShowConfirmRestore(true);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers change if chosen again
    e.target.value = '';

    setSelectedFile(file);
    setShowConfirmRestore(false);
    setValidationResult(null);
    setSafetyBackupDownloaded(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateBackupFileContent(content);
      setValidationResult(result);
      if (result.isValid) {
        setShowConfirmRestore(true);
      }
    };
    reader.onerror = () => {
      setValidationResult({
        isValid: false,
        error: 'Error reading file from disk. Please try again.',
      });
    };
    reader.readAsText(file);
  };

  // Handle Confirmed Restore
  const handleConfirmRestore = () => {
    if (!validationResult?.isValid || !validationResult.backupData) {
      return;
    }

    setIsProcessing(true);

    try {
      // 1. DATA SAFETY: Automatically preserve safety snapshot of current live data in storage first (no unwanted downloads)
      createPreRestoreSafetyBackup(products, sales, stockLogs, false);
      setSafetyBackupDownloaded('Current live data safely backed up to storage.');

      // 2. Write validated restored data to persistent localStorage
      const success = restoreBackupToStorage(validationResult.backupData);

      if (!success) {
        throw new Error('Failed writing backup data to storage.');
      }

      // 3. Immediately update active app state to refresh dashboard and all screens
      onDataRestored(
        validationResult.backupData.data.products,
        validationResult.backupData.data.sales,
        validationResult.backupData.data.stockLogs
      );

      showToast(
        `Backup restored successfully! ${validationResult.backupData.data.products.length} products, ${validationResult.backupData.data.sales.length} sales loaded.`
      );

      // Close modal after brief confirmation display
      setTimeout(() => {
        onClose();
        // Reset local modal state
        setSelectedFile(null);
        setValidationResult(null);
        setShowConfirmRestore(false);
        setIsProcessing(false);
      }, 700);
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Restore failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const resetRestoreState = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setShowConfirmRestore(false);
    setSafetyBackupDownloaded(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
                <span>Backup & Restore Data Center</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                  Admin Safe Mode
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Direct browser backup & restore without launching external editors or VS Code.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-5 pt-3">
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'download'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download & Save Backup</span>
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restore Backup</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* TAB 1: DOWNLOAD BACKUP */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              {/* Direct Save Notice Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300">
                    Direct Browser File Download
                  </span>
                  <p className="text-emerald-300/80 text-[11px] mt-0.5">
                    Backup files are downloaded directly into your computer's Downloads directory via binary stream. They will <strong>not open in VS Code</strong> or any external editor automatically.
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Live Store Snapshot
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Ready to Export
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>Products</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      {products.length}
                    </div>
                    <div className="text-[10px] text-neutral-500">Catalog items</div>
                  </div>

                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Stock Units</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      {totalStockUnits}
                    </div>
                    <div className="text-[10px] text-neutral-500">Across all sizes</div>
                  </div>

                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sales Bills</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      {sales.length}
                    </div>
                    <div className="text-[10px] text-neutral-500">Customer invoices</div>
                  </div>

                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Stock Logs</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      {stockLogs.length}
                    </div>
                    <div className="text-[10px] text-neutral-500">Audit trail</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Container */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-neutral-300 block">
                  Export & Protection Options
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Primary Option: Download .json */}
                  <button
                    onClick={() => handleDownload('json')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-xl text-left transition-all shadow-md shadow-amber-500/10 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download Backup (.json)</span>
                    </div>
                    <span className="text-[10px] font-normal text-neutral-900/80 mt-1">
                      Standard JSON format • Saves directly to Downloads
                    </span>
                  </button>

                  {/* Option B: Download .bak (Never associated with VS Code) */}
                  <button
                    onClick={() => handleDownload('bak')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-3 bg-neutral-800 hover:bg-neutral-750 active:bg-neutral-700 text-neutral-100 border border-neutral-700 hover:border-neutral-600 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Download Safe Archive (.bak)</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1">
                      Guaranteed never to open in VS Code on any computer
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Option C: Copy to Clipboard */}
                  <button
                    onClick={handleCopyClipboard}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 hover:border-neutral-650 rounded-xl text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Copy JSON to Clipboard</span>
                      </>
                    )}
                  </button>

                  {/* Option D: Save to In-Browser Safe Vault */}
                  <button
                    onClick={handleSaveToVault}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 hover:border-neutral-650 rounded-xl text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to In-Browser Vault</span>
                  </button>
                </div>

                {/* In-App Preview Toggle */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    Want to inspect data without opening external editors?
                  </span>
                  <button
                    onClick={() => setShowInAppPreview(!showInAppPreview)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    {showInAppPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showInAppPreview ? 'Hide In-App Preview' : 'Inspect Backup Inside App'}</span>
                  </button>
                </div>

                {/* In-App JSON Viewer */}
                {showInAppPreview && (
                  <div className="mt-2 bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-1.5">
                      <span className="font-mono text-amber-400">In-App Live Preview</span>
                      <button
                        onClick={handleCopyClipboard}
                        className="text-[10px] text-neutral-300 hover:text-neutral-100 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-neutral-300 max-h-48 overflow-y-auto overflow-x-auto p-2 bg-neutral-900 rounded border border-neutral-800 select-all leading-relaxed">
                      {JSON.stringify(currentBackupPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* In-Browser Vault Snapshots List */}
              {vaultSnapshots.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In-Browser Safe Vault ({vaultSnapshots.length})</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">Stored locally in browser</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {vaultSnapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="flex items-center justify-between p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs"
                      >
                        <div>
                          <div className="font-medium text-neutral-200 text-[11px]">{snap.name}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {snap.formattedDate} • {snap.summary.totalProducts} prods • {snap.summary.totalStockUnits} units
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRestoreFromSnapshot(snap)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded text-[10px] font-medium transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESTORE BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {/* File upload selector */}
              {!selectedFile && (
                <label
                  className="block border-2 border-dashed border-neutral-700 hover:border-amber-500/60 bg-neutral-950/60 hover:bg-neutral-950 rounded-xl p-8 text-center cursor-pointer transition-all group relative select-none"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.bak,application/json,application/octet-stream,text/plain"
                    onChange={handleFileChange}
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
                    aria-label="Select JSON backup file"
                  />
                  <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-amber-500/10 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors">
                    Click to select backup file (.json or .bak)
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Select a previously downloaded backup from Somaiya Men's Wear (read in-browser, no VS Code needed)
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Backup File</span>
                  </div>
                </label>
              )}

              {/* Validation Error Message */}
              {validationResult && !validationResult.isValid && (
                <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 text-xs text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Backup Validation Failed</span>
                  </div>
                  <p className="text-red-300/90 pl-6">{validationResult.error}</p>
                  <div className="pt-2 pl-6">
                    <button
                      onClick={resetRestoreState}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium"
                    >
                      Choose Another File
                    </button>
                  </div>
                </div>
              )}

              {/* Validated Backup Preview & Confirmation */}
              {validationResult?.isValid && validationResult.backupData && showConfirmRestore && (
                <div className="space-y-4">
                  {/* Backup metadata preview */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-neutral-100 font-mono">
                          {selectedFile?.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Valid Backup v{validationResult.backupData.version}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Products</span>
                        <span className="text-base font-bold font-mono text-neutral-100">
                          {validationResult.backupData.data.products.length}
                        </span>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Total Stock</span>
                        <span className="text-base font-bold font-mono text-neutral-100">
                          {validationResult.backupData.summary.totalStockUnits} pcs
                        </span>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Sales Records</span>
                        <span className="text-base font-bold font-mono text-neutral-100">
                          {validationResult.backupData.data.sales.length}
                        </span>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px]">Stock Logs</span>
                        <span className="text-base font-bold font-mono text-neutral-100">
                          {validationResult.backupData.data.stockLogs.length}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1">
                      <span>Exported on:</span>
                      <span className="font-mono text-neutral-300">
                        {validationResult.backupData.exportDateFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Safety & Confirmation Banner */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Confirm Database Restoration</span>
                    </div>
                    <p className="text-neutral-300 text-[11px] leading-relaxed">
                      Restoring this backup will replace current live products, sales, and stock logs with the data from this backup file.
                    </p>
                    <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800 flex items-start gap-2 text-[11px] text-neutral-300">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-400">Automatic Safety Backup:</strong> Before replacing data, the system will automatically create and download a dated backup of your current active records so no data is ever lost.
                      </div>
                    </div>
                  </div>

                  {safetyBackupDownloaded && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pre-restore safety backup saved: {safetyBackupDownloaded}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={resetRestoreState}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
                    >
                      Cancel & Choose Different File
                    </button>

                    <button
                      onClick={handleConfirmRestore}
                      disabled={isProcessing}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      <RotateCcw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>{isProcessing ? 'Restoring Data...' : 'Restore Backup Now'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500/80" />
            <span>Somaiya Men's Wear Admin System</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
