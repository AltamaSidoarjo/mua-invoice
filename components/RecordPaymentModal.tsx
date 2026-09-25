"use client";

import { useState } from "react";
import { Invoice } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { CreditCard, CheckCircle2, AlertCircle, X, DollarSign } from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: (updatedInvoice: Invoice) => void;
}

const PAYMENT_METHODS = [
  "Transfer BCA",
  "Transfer Mandiri",
  "Transfer BNI",
  "Transfer BRI",
  "Transfer BSI",
  "QRIS",
  "Tunai / Cash",
  "Lainnya",
];

export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(invoice.balance_due > 0 ? invoice.balance_due : 0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Transfer BCA");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalContract = Math.max(0, invoice.subtotal - invoice.discount);
  const dp30 = Math.round(totalContract * 0.3);
  const dp50 = Math.round(totalContract * 0.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Nominal pembayaran harus lebih dari 0.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pembayaran.");
        setLoading(false);
        return;
      }

      onPaymentSuccess(data.invoice);
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base">Catat Pembayaran Masuk</h3>
              <p className="text-[11px] text-slate-300">
                {invoice.invoice_number} &bull; {invoice.client_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Outstanding Balance Banner */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-amber-700 block font-medium">Sisa Tagihan Saat Ini:</span>
              <span className="font-mono font-bold text-base text-amber-900">
                {formatRupiah(invoice.balance_due)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Total Kontrak: {formatRupiah(totalContract)}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Pilihan Cepat Nominal:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {invoice.balance_due > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(invoice.balance_due)}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Lunaskan Sisa ({formatRupiah(invoice.balance_due)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setAmount(dp30)}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                DP 30% ({formatRupiah(dp30)})
              </button>
              <button
                type="button"
                onClick={() => setAmount(dp50)}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                DP 50% ({formatRupiah(dp50)})
              </button>
            </div>
          </div>

          {/* Input Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Diterima (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                required
                min="1000"
                step="50000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="5000000"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pembayaran
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Bukti Transfer
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Transfer m-BCA Mas Dimas"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-200 transition-all disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Menyimpan..." : "Simpan Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
