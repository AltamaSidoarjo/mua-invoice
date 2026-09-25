"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Invoice, InvoiceItem, InvoiceStatus, MuaProfile } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Save,
} from "lucide-react";

interface InvoiceFormProps {
  initialData?: Invoice | null;
  isEdit?: boolean;
}

const COMMON_SERVICES = [
  { label: "Make Up Bride (Akad & Resepsi)", price: 3500000 },
  { label: "Make Up Lamaran / Engagement", price: 1500000 },
  { label: "Make Up Ibu Pengantin (2 Pax)", price: 1200000 },
  { label: "Make Up Bridesmaid / Keluarga (Pax)", price: 400000 },
  { label: "Make Up Wisuda / Graduation", price: 500000 },
  { label: "Retouch & Standby Acara", price: 750000 },
  { label: "Sewa Aksesoris & Melati", price: 500000 },
  { label: "Transportasi & Akomodasi Luar Kota", price: 300000 },
];

export default function InvoiceForm({ initialData, isEdit = false }: InvoiceFormProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<MuaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || "");
  const [clientName, setClientName] = useState(initialData?.client_name || "");
  const [clientPhone, setClientPhone] = useState(initialData?.client_phone || "");
  const [eventType, setEventType] = useState(initialData?.event_type || "Wedding / Pernikahan");
  const [eventDate, setEventDate] = useState(initialData?.event_date || "");
  const [eventTime, setEventTime] = useState(initialData?.event_time || "");
  const [eventVenue, setEventVenue] = useState(initialData?.event_venue || "");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || todayStr);
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");

  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [
          {
            item_order: 0,
            description: "Paket Make Up Bride (Akad & Resepsi)",
            quantity: 1,
            unit_price: 3500000,
            total_price: 3500000,
          },
        ]
  );

  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [dpAmount, setDpAmount] = useState<number>(initialData?.dp_amount || 0);
  const [status, setStatus] = useState<InvoiceStatus>(initialData?.status || "draft");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [terms, setTerms] = useState(initialData?.terms || "");

  // Fetch profile for default terms/notes if creating new
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          if (!isEdit) {
            if (!notes) setNotes(d.profile.default_notes || "");
            if (!terms) setTerms(d.profile.default_terms || "");
          }
        }
      })
      .catch(() => {});

    if (!isEdit && !invoiceNumber) {
      fetch("/api/invoices/next-number")
        .then((r) => r.json())
        .then((d) => {
          if (d.nextNumber) setInvoiceNumber(d.nextNumber);
        })
        .catch(() => {});
    }
  }, [isEdit, notes, terms, invoiceNumber]);

  // Financial calculations
  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unit_price) || 0), 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));
  const balanceDue = Math.max(0, grandTotal - (Number(dpAmount) || 0));

  // Auto adjust status if user hasn't explicitly set cancelled
  const handleFinancialChange = (newDiscount: number, newDp: number) => {
    setDiscount(newDiscount);
    setDpAmount(newDp);

    const calcTotal = Math.max(0, subtotal - newDiscount);
    const calcBal = Math.max(0, calcTotal - newDp);

    if (status !== "cancelled") {
      if (calcBal === 0 && calcTotal > 0) {
        setStatus("paid");
      } else if (newDp > 0) {
        setStatus("dp_paid");
      } else {
        setStatus("draft");
      }
    }
  };

  const handleAddItem = (preset?: { label: string; price: number }) => {
    setItems((prev) => [
      ...prev,
      {
        item_order: prev.length,
        description: preset ? preset.label : "",
        quantity: 1,
        unit_price: preset ? preset.price : 0,
        total_price: preset ? preset.price : 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };
      if (field === "quantity" || field === "unit_price") {
        const q = field === "quantity" ? Number(val) || 0 : Number(target.quantity) || 0;
        const p = field === "unit_price" ? Number(val) || 0 : Number(target.unit_price) || 0;
        target.total_price = q * p;
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("Invoice minimal harus memiliki 1 rincian layanan.");
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim()) {
      setError("Nama klien wajib diisi.");
      return;
    }

    if (items.some((it) => !it.description.trim())) {
      setError("Semua baris layanan wajib memiliki deskripsi.");
      return;
    }

    setLoading(true);

    const payload = {
      invoice_number: invoiceNumber.trim() || undefined,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      event_type: eventType,
      event_date: eventDate,
      event_time: eventTime,
      event_venue: eventVenue.trim(),
      issue_date: issueDate,
      due_date: dueDate,
      discount: Number(discount) || 0,
      dp_amount: Number(dpAmount) || 0,
      status,
      notes,
      terms,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
      })),
    };

    try {
      const url = isEdit ? `/api/invoices/${initialData?.id}` : "/api/invoices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        setError(resData.error || "Gagal menyimpan invoice.");
        setLoading(false);
        return;
      }

      const savedId = isEdit ? initialData?.id : resData.invoice?.id;
      router.push(`/invoices/${savedId}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top Header & Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dashboard
          </Link>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            {isEdit ? `Edit Invoice #${initialData?.invoice_number}` : "Buat Invoice MUA Baru"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white font-semibold text-xs shadow-md shadow-rose-200 transition-all disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {loading ? "Menyimpan..." : isEdit ? "Perbarui Invoice" : "Simpan & Lihat Invoice"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Dokumen & Data Klien */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Info Dokumen Invoice */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-rose-500" />
            Informasi Dokumen
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  No. Invoice
                </label>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  Auto-Generated
                </span>
              </div>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-YYYYMMDD-001"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Pembayaran
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              >
                <option value="draft">Draft / Menunggu Pembayaran</option>
                <option value="dp_paid">DP Terbayar (Sisa Pelunasan)</option>
                <option value="paid">Lunas</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Terbit
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Pelunasan / Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Data Klien & Acara */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-rose-500" />
            Data Klien & Jadwal Acara
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Klien / Calon Pengantin *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="contoh: Kak Vania & Mas Arya"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. WhatsApp Klien
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Acara
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="Wedding / Pernikahan">Wedding / Pernikahan</option>
                <option value="Lamaran / Engagement">Lamaran / Engagement</option>
                <option value="Wisuda / Graduation">Wisuda / Graduation</option>
                <option value="Prewedding / Photoshoot">Prewedding / Photoshoot</option>
                <option value="Party / Event / Pesta">Party / Event / Pesta</option>
                <option value="Maternity Photoshoot">Maternity Photoshoot</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal & Jam Acara
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi / Venue Acara
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="Gedung Puri Ardhya Garini / Rumah Klien, Jakarta Selatan"
                  className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Rincian Layanan / Line Items */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-serif font-bold text-slate-900 text-base">
              Rincian Layanan Make Up
            </h3>
            <p className="text-xs text-slate-500">
              Tambahkan paket riasan, jumlah orang (qty), dan biaya jasa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAddItem()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Baris Layanan
          </button>
        </div>

        {/* Quick Presets */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Pilihan Cepat Layanan Populer:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SERVICES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddItem(preset)}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg text-xs text-slate-600 transition-colors cursor-pointer"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3">Deskripsi Layanan</th>
                <th className="py-2.5 px-3 w-24 text-center">Qty / Pax</th>
                <th className="py-2.5 px-3 w-40 text-right">Harga Satuan (Rp)</th>
                <th className="py-2.5 px-3 w-40 text-right">Total (Rp)</th>
                <th className="py-2.5 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                      placeholder="Nama layanan (contoh: Make Up Bride)"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, "quantity", e.target.value)}
                      className="w-full px-2 py-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(index, "unit_price", e.target.value)}
                      className="w-full px-3 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                    {formatRupiah(item.total_price)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations / Summary */}
        <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="w-full md:max-w-md space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan untuk klien..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Syarat & Ketentuan (T&C)
              </label>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Ketentuan DP, pembatalan, pelunasan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="w-full md:w-80 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatRupiah(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Diskon (Potongan):</span>
              <div className="w-36">
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={discount}
                  onChange={(e) => handleFinancialChange(Number(e.target.value) || 0, dpAmount)}
                  className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Tagihan:</span>
              <span className="text-sm font-bold text-rose-600">{formatRupiah(grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 pt-2 border-t border-slate-200">
              <span>Uang Muka / DP Dibayar:</span>
              <div className="w-36">
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={dpAmount}
                  onChange={(e) => handleFinancialChange(discount, Number(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-200 text-slate-900">
              <span>Sisa Tagihan / Pelunasan:</span>
              <span className={`text-base ${balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatRupiah(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
