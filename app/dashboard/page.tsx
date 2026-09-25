"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Invoice, InvoiceStatus, MuaProfile } from "@/lib/types";
import { formatRupiah, formatDateIndo, getStatusBadge, buildWhatsAppUrl } from "@/lib/utils";
import {
  PlusCircle,
  Search,
  FileText,
  Calendar,
  MapPin,
  Clock,
  Printer,
  Edit,
  Trash2,
  Share2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import RecordPaymentModal from "@/components/RecordPaymentModal";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<MuaProfile | null>(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    countPaid: 0,
    countDp: 0,
    countDraft: 0,
    countCancelled: 0,
    totalVolume: 0,
    totalCollected: 0,
    totalPending: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    // Check auth
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/login");
          return;
        }
        if (data.profile) {
          setProfile(data.profile);
        }
        loadData();
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const loadData = async (search = searchTerm, status = statusFilter) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (status && status !== "all") q.set("status", status);

      const [invRes, statsRes] = await Promise.all([
        fetch(`/api/invoices?${q.toString()}`),
        fetch("/api/invoices/stats"),
      ]);

      const invData = await invRes.json();
      const statsData = await statsRes.json();

      if (invData.invoices) setInvoices(invData.invoices);
      if (statsData.stats) setStats(statsData.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchTerm, statusFilter);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    loadData(searchTerm, status);
  };

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Hapus invoice ${invoiceNumber}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== id));
        // Refresh stats
        fetch("/api/invoices/stats")
          .then((r) => r.json())
          .then((d) => d.stats && setStats(d.stats));
      } else {
        alert("Gagal menghapus invoice.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Manajemen Invoice & Klien</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pantau jadwal riasan, tagihan DP, dan pelunasan klien MUA Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white font-medium text-sm shadow-md shadow-rose-200 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Buat Invoice Baru
            </Link>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Total Invoice</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalInvoices}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.countPaid} lunas • {stats.countDp} sisa pelunasan
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Total Omset</span>
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatRupiah(stats.totalVolume)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Nilai keseluruhan kontrak</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Dana Masuk (DP+Lunas)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {formatRupiah(stats.totalCollected)}
            </div>
            <div className="text-xs text-emerald-600/80 mt-1">Sudah diterima di rekening</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 bg-amber-50/30 shadow-xs">
            <div className="flex items-center justify-between text-amber-800 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Sisa Piutang</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700">
              {formatRupiah(stats.totalPending)}
            </div>
            <div className="text-xs text-amber-600/80 mt-1">Menunggu pelunasan klien</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "Semua" },
                { id: "draft", label: "Draft" },
                { id: "dp_paid", label: "DP Terbayar" },
                { id: "paid", label: "Lunas" },
                { id: "cancelled", label: "Dibatalkan" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilterChange(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, no. invoice, acara..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Cari
              </button>
            </form>
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Memuat data invoice...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-serif font-bold text-slate-800 mb-1">
              Belum Ada Invoice
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
              Buat invoice profesional pertama untuk klien make up Anda. Bisa langsung cetak PDF atau kirim via WhatsApp.
            </p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Buat Invoice Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const badge = getStatusBadge(inv.status);
              const waUrl = profile ? buildWhatsAppUrl(inv, profile) : "#";

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-rose-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Client & Event */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-serif font-bold text-base text-slate-900 hover:text-rose-600 transition-colors"
                      >
                        {inv.client_name}
                      </Link>
                      <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {inv.invoice_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        {inv.event_type || "Acara MUA"}
                      </span>
                      {inv.event_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateIndo(inv.event_date)}
                          {inv.event_time ? ` (${inv.event_time})` : ""}
                        </span>
                      )}
                      {inv.event_venue && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={inv.event_venue}>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{inv.event_venue}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Financial Breakdown */}
                  <div className="flex items-center gap-6 sm:gap-8 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0 md:px-6">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        Total Tagihan
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatRupiah(inv.subtotal - inv.discount)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        DP
                      </div>
                      <div className="text-sm font-semibold text-emerald-600">
                        {formatRupiah(inv.dp_amount)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        Sisa Tagihan
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          inv.balance_due > 0 ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        {formatRupiah(inv.balance_due)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    {/* Quick Record Payment */}
                    <button
                      onClick={() => setPaymentInvoice(inv)}
                      title="Catat Pembayaran Masuk"
                      className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>

                    {/* WhatsApp Button */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Kirim ke WhatsApp Klien"
                      className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>

                    {/* View & Print PDF */}
                    <Link
                      href={`/invoices/${inv.id}`}
                      title="Lihat & Cetak PDF"
                      className="p-2 rounded-xl text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>

                    {/* Edit */}
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      title="Edit Invoice"
                      className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(inv.id, inv.invoice_number)}
                      disabled={deletingId === inv.id}
                      title="Hapus Invoice"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Catat Pembayaran */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          invoice={paymentInvoice}
          onPaymentSuccess={() => {
            setPaymentInvoice(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
