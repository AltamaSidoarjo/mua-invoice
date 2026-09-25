import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createInvoice, listInvoices } from "@/lib/invoice";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const invoices = await listInvoices(user.id, search, status);
    return NextResponse.json({ invoices });
  } catch (err: any) {
    console.error("List invoices error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar invoice." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    if (!data.client_name || !data.client_name.trim()) {
      return NextResponse.json(
        { error: "Nama klien wajib diisi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: "Minimal harus ada satu item layanan." },
        { status: 400 }
      );
    }

    const invoice = await createInvoice(user.id, data);
    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    console.error("Create invoice error:", err);
    return NextResponse.json(
      { error: "Gagal membuat invoice." },
      { status: 500 }
    );
  }
}
