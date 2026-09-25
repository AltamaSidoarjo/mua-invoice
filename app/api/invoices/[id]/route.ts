import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteInvoice, getPublicInvoiceById, updateInvoice } from "@/lib/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  try {
    const data = await getPublicInvoiceById(id);
    if (!data) {
      return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
    }

    const isOwner = user ? user.id === data.invoice.user_id : false;

    return NextResponse.json({
      invoice: data.invoice,
      profile: data.profile,
      isOwner,
    });
  } catch (err: any) {
    console.error("Get invoice error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data invoice." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await req.json();
    const updated = await updateInvoice(user.id, id, data);

    if (!updated) {
      return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    console.error("Update invoice error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui invoice." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ok = await deleteInvoice(user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Invoice tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete invoice error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus invoice." },
      { status: 500 }
    );
  }
}
