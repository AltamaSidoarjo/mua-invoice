"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Invoice, MuaProfile } from "@/lib/types";
import { formatRupiah, formatDateIndo, getStatusBadge, buildWhatsAppUrl } from "@/lib/utils";
import {
  Printer,
  Download,
  Share2,
  Edit,
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Camera,
  CheckCircle,
  CreditCard,
  Building2,
} from "lucide-react";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<MuaProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/invoices/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((invData) => {
        if (invData.invoice) setInvoice(invData.invoice);
        if (invData.profile) setProfile(invData.profile);
        if (invData.isOwner) setIsOwner(invData.isOwner);
      })
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || !invoice) return;
    setGeneratingPdf(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoice_number}_${invoice.client_name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Gagal mengunduh PDF. Anda dapat menggunakan tombol 'Cetak / Simpan PDF' sebagai alternatif.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-center text-slate-400">
          Memuat data invoice...
        </main>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-center text-rose-500 font-semibold">
          Invoice tidak ditemukan.
        </main>
      </div>
    );
  }

  const badge = getStatusBadge(invoice.status);
  const waUrl = profile ? buildWhatsAppUrl(invoice, profile) : "#";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {isOwner && <Navbar />}

      {/* Action Toolbar (Hidden during print) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {isOwner ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-serif font-bold text-sm text-slate-900">
                {profile?.business_name || "MUA Studio"}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share (Owner only) */}
            {isOwner && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Kirim via WhatsApp
              </a>
            )}

            {/* Print / Save PDF Native */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>

            {/* Direct Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {generatingPdf ? "Memproses PDF..." : "Unduh PDF"}
            </button>

            {/* Edit (Owner only) */}
            {isOwner && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document Wrapper */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none">
        <div
          ref={invoiceRef}
          id="invoice-paper"
          className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-12 print:shadow-none print:border-none print:p-6 print:rounded-none text-slate-900 relative"
        >
          {/* Aesthetic Watermark Stamp for Paid Status */}
          {invoice.status === "paid" && (
            <div className="absolute top-36 right-12 border-4 border-emerald-600/30 text-emerald-700/40 font-serif font-black text-4xl sm:text-5xl tracking-widest uppercase px-6 py-2 rounded-2xl rotate-[-15deg] pointer-events-none select-none">
              LUNAS
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b-2 border-slate-900">
            {/* Left: MUA Business Info */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
                  {profile?.business_name || "MUA Studio"}
                </h1>
              </div>

              {profile?.owner_name && (
                <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  Lead Artist: {profile.owner_name}
                </div>
              )}

              {profile?.address && (
                <div className="text-xs text-slate-500 max-w-xs">{profile.address}</div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                {profile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {profile.phone}
                  </span>
                )}
                {profile?.instagram && (
                  <span className="flex items-center gap-1">
                    <Camera className="w-3 h-3 text-slate-400" />
                    @{profile.instagram.replace(/^@/, "")}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Invoice Label & Metadata */}
            <div className="text-left sm:text-right space-y-1.5">
              <div className="text-3xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight uppercase">
                INVOICE
              </div>
              <div className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md inline-block">
                {invoice.invoice_number}
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 pt-2">
                <div>
                  <span className="text-slate-400">Tanggal Terbit: </span>
                  <span className="font-semibold">{formatDateIndo(invoice.issue_date)}</span>
                </div>
                {invoice.due_date && (
                  <div>
                    <span className="text-slate-400">Jatuh Tempo: </span>
                    <span className="font-semibold">{formatDateIndo(invoice.due_date)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

            {/* Client & Event Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
            {/* Left: Client Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Ditujukan Kepada:
              </span>
              <div className="text-base font-serif font-bold text-slate-900">
                {invoice.client_name}
              </div>
              {invoice.client_phone && (
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{invoice.client_phone}</span>
                </div>
              )}
            </div>

            {/* Right: Event Schedule & Location */}
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block mb-2">
                Jadwal & Lokasi Acara:
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>{invoice.event_type || "Make Up"}</span>
              </div>

              {invoice.event_date && (
                <div className="text-xs text-slate-700 mt-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    {formatDateIndo(invoice.event_date)}
                    {invoice.event_time ? ` • ${invoice.event_time} WIB` : ""}
                  </span>
                </div>
              )}

              {invoice.event_venue && (
                <div className="text-xs text-slate-700 mt-1.5 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{invoice.event_venue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Deskripsi Layanan / Paket Riasan</th>
                  <th className="py-3 px-3 w-20 text-center">Qty</th>
                  <th className="py-3 px-3 w-36 text-right">Harga Satuan</th>
                  <th className="py-3 px-3 w-36 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatRupiah(item.unit_price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(item.total_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Tidak ada rincian item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Payment Account Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 pb-8 border-t-2 border-slate-200">
            {/* Left: Bank Transfer Details */}
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wide mb-2">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  Metode Pembayaran Transfer
                </div>
                {profile?.bank_account ? (
                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Bank:</span>
                      <span className="font-bold text-slate-900">{profile.bank_name || "BCA"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Nomor Rekening:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {profile.bank_account}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Atas Nama:</span>
                      <span className="font-semibold text-slate-900">
                        {profile.bank_holder || profile.owner_name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Belum mengatur rekening di menu Pengaturan.
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Mohon kirimkan bukti transfer setelah pembayaran dilakukan.
                </div>
              </div>

              {invoice.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-slate-700">
                  <span className="font-bold block text-amber-800 text-[11px] uppercase tracking-wider mb-1">
                    Catatan:
                  </span>
                  <p className="whitespace-pre-line leading-relaxed text-[11px]">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Right: Totals Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600 py-1">
                <span>Subtotal Layanan:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatRupiah(invoice.subtotal)}
                </span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between items-center text-xs text-rose-600 py-1">
                  <span>Diskon / Potongan:</span>
                  <span className="font-mono font-semibold">
                    -{formatRupiah(invoice.discount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Tagihan:</span>
                <span className="font-mono text-base">
                  {formatRupiah(invoice.subtotal - invoice.discount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-emerald-700 py-1">
                <span>Uang Muka / DP Dibayar:</span>
                <span className="font-mono font-semibold">
                  {formatRupiah(invoice.dp_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-3 pb-3 border-y-2 border-slate-900 bg-rose-50/40 px-3 rounded-lg">
                <span className="text-slate-900">SISA PELUNASAN:</span>
                <span
                  className={`font-mono text-lg font-black ${
                    invoice.balance_due > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatRupiah(invoice.balance_due)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {invoice.terms && (
            <div className="pt-4 pb-8 border-b border-slate-200 text-xs text-slate-500">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-2">
                Syarat & Ketentuan Booking:
              </span>
              <div className="whitespace-pre-line leading-relaxed text-[11px] font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                {invoice.terms}
              </div>
            </div>
          )}

          {/* Signature & Closing */}
          <div className="pt-8 flex justify-between items-end text-xs">
            <div className="text-slate-400 text-[11px]">
              Dicetak otomatis via Sistem Invoice MUA • {profile?.business_name}
            </div>

            <div className="text-center w-48 space-y-12">
              <div className="text-slate-500">
                Hormat Kami,
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm font-serif border-b border-slate-300 pb-1">
                  {profile?.owner_name || profile?.business_name || "Make Up Artist"}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                  Lead Artist / Management
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
