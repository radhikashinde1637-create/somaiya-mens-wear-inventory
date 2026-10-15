import React from 'react';
import { Sale } from '../types';
import { formatDateTime } from '../utils/storage';
import { X, Printer, CheckCircle } from 'lucide-react';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl my-auto overflow-hidden">
        {/* Top Dialog Action Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/60 print:hidden">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Sale Completed Successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="printable-receipt"
          className="p-6 bg-white text-neutral-900 font-sans text-xs selection:bg-neutral-200"
        >
          {/* Store Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-neutral-300">
            <h2 className="font-brand text-2xl font-bold tracking-tight text-neutral-950 uppercase">
              Somaiya Men's Wear
            </h2>
            <p className="text-[11px] text-neutral-600 mt-0.5 tracking-wide uppercase">
              Gentlemen's Apparel & Tailoring
            </p>
            <p className="text-[10px] text-neutral-500 mt-1">
              Main Market Road · Sales Receipt
            </p>
          </div>

          {/* Invoice Meta */}
          <div className="py-3 border-b border-dashed border-neutral-300 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-500 block">Invoice Number:</span>
              <span className="font-mono font-bold text-neutral-900">
                {sale.invoiceNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block">Date & Time:</span>
              <span className="font-medium text-neutral-900">
                {formatDateTime(sale.date)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Customer Name:</span>
              <span className="font-semibold text-neutral-900">
                {sale.customerName || 'Walk-in Customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block">Mobile Number:</span>
              <span className="font-mono font-medium text-neutral-900">
                {sale.customerPhone || '—'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-neutral-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="pb-1 font-medium">Product</th>
                  <th className="pb-1 font-medium text-center">Qty</th>
                  <th className="pb-1 font-medium text-right">Price</th>
                  <th className="pb-1 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sale.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1.5 pr-2">
                      <div className="font-medium text-neutral-900 leading-tight">
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Size: {item.size} · Color: {item.color}
                      </div>
                    </td>
                    <td className="py-1.5 text-center font-mono font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right font-mono text-neutral-700">
                      ₹{item.sellingPrice}
                    </td>
                    <td className="py-1.5 text-right font-mono font-bold text-neutral-900">
                      ₹{item.subtotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals */}
          <div className="py-3 border-b border-neutral-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{sale.subtotal}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Discount:</span>
                <span className="font-mono text-red-600">- ₹{sale.discount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-neutral-950 pt-1.5 border-t border-neutral-200">
              <span>Net Amount:</span>
              <span className="font-mono">₹{sale.totalAmount}</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-600 pt-1">
              <span>Payment Mode:</span>
              <span className="font-medium text-neutral-900">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-[10px] text-neutral-500 space-y-1">
            <p className="font-semibold text-neutral-700">
              Thank you for shopping at Somaiya Men's Wear!
            </p>
            <p>Exchange valid within 7 days with original bill.</p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between print:hidden">
          <span className="text-xs text-neutral-400">
            Stock reduced automatically in system.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
