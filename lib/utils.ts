import { Invoice, InvoiceStatus, MuaProfile } from "./types";

export function formatRupiah(amount: number | undefined | null): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDateIndo(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function getStatusBadge(status: InvoiceStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case "paid":
      return {
        label: "Lunas",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "dp_paid":
      return {
        label: "DP Terbayar",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "cancelled":
      return {
        label: "Dibatalkan",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      };
    case "draft":
    default:
      return {
        label: "Draft / Tagihan",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        dotClass: "bg-slate-400",
      };
  }
}

export function buildWhatsAppUrl(invoice: Invoice, profile: MuaProfile): string {
  let phone = (invoice.client_phone || "").replace(/\D/g, "");
  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  } else if (!phone.startsWith("62") && phone.length > 5) {
    phone = "62" + phone;
  }

  const itemsList = (invoice.items || [])
    .map((item, idx) => `  ${idx + 1}. ${item.description} (${item.quantity}x) - ${formatRupiah(item.total_price)}`)
    .join("\n");

  const statusLabel =
    invoice.status === "paid"
      ? "LUNAS ✅"
      : invoice.status === "dp_paid"
      ? "DP SUDAH DIBAYAR (Sisa Pelunasan)"
      : "TAGIHAN / BELUM BAYAR";

  const bankInfo = profile.bank_account
    ? `\n*Metode Pembayaran (Transfer Bank):*\nBank: ${profile.bank_name || "BCA"}\nNo. Rek: *${profile.bank_account}*\na.n: *${profile.bank_holder || profile.owner_name}*\n`
    : "";

  const eventSchedule = invoice.event_date
    ? `📅 *Tanggal Acara:* ${formatDateIndo(invoice.event_date)}${invoice.event_time ? ` (${invoice.event_time} WIB)` : ""}\n`
    : "";

  const venueInfo = invoice.event_venue ? `📍 *Lokasi/Venue:* ${invoice.event_venue}\n` : "";

  const message = `Halo Kak *${invoice.client_name}*,

Berikut kami kirimkan rincian invoice riasan dari *${profile.business_name || "MUA Studio"}*:

📄 *No. Invoice:* \`${invoice.invoice_number}\`
✨ *Jenis Acara:* ${invoice.event_type || "Make Up"}
${eventSchedule}${venueInfo}
*Rincian Layanan:*
${itemsList || "  - Paket Riasan"}

--------------------------------
💵 *Subtotal:* ${formatRupiah(invoice.subtotal)}
${invoice.discount > 0 ? `🎁 *Diskon:* -${formatRupiah(invoice.discount)}\n` : ""}💰 *Total Tagihan:* ${formatRupiah(invoice.subtotal - invoice.discount)}
💳 *DP Diterima:* ${formatRupiah(invoice.dp_amount)}
⚡ *Sisa Tagihan:* *${formatRupiah(invoice.balance_due)}*
📌 *Status:* *${statusLabel}*
--------------------------------
${bankInfo}
Mohon konfirmasi setelah melakukan transfer. Terima kasih telah mempercayakan momen bahagia Anda kepada kami! 🙏✨`;

  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
}
