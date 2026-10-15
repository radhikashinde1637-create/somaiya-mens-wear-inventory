import React from 'react';
import { Product } from '../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: Product | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  product,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              Delete Product from Inventory?
            </h3>
            <p className="text-xs text-neutral-400">
              This action removes the garment permanently from catalog
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl mb-4 text-xs space-y-1">
          <p className="font-semibold text-neutral-200">{product.name}</p>
          <p className="text-neutral-400 font-mono text-[11px]">
            SKU: {product.sku} · {product.category} · Size: {product.size}
          </p>
          {product.quantity > 0 && (
            <div className="pt-2 mt-2 border-t border-neutral-800 flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Note: This item currently has <strong>{product.quantity} units</strong> in physical stock!
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};
