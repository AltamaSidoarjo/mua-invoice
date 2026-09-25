import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";
import { getInvoiceById } from "@/lib/invoice";
import crypto from "node:crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await initDb();
  const db = getDb();

  try {
    const res = await db.execute({
      sql: "SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC;",
      args: [id],
    });

    const payments = res.rows.map((row) => ({
      id: String(row.id),
      invoice_id: String(row.invoice_id),
      amount: Number(row.amount),
      payment_date: String(row.payment_date),
      payment_method: String(row.payment_method),
      notes: String(row.notes || ""),
      created_at: Number(row.created_at),
    }));

    return NextResponse.json({ payments });
  } catch (err: any) {
    console.error("Get payments error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil riwayat pembayaran." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingInvoice = await getInvoiceById(user.id, id);
  if (!existingInvoice) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const paymentMethod = body.payment_method || "Transfer Bank";
    const paymentDate = body.payment_date || new Date().toISOString().slice(0, 10);
    const notes = body.notes || "";

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Nominal pembayaran harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();
    const paymentId = crypto.randomUUID();
    const now = Date.now();

    // Insert payment
    await db.execute({
      sql: `
        INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      args: [paymentId, id, amount, paymentDate, paymentMethod, notes, now],
    });

    // Calculate sum of all payments for this invoice
    const sumRes = await db.execute({
      sql: "SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?;",
      args: [id],
    });
    const totalPaid = Number(sumRes.rows[0]?.total_paid || 0);

    const grandTotal = Math.max(0, existingInvoice.subtotal - existingInvoice.discount);
    const newBalanceDue = Math.max(0, grandTotal - totalPaid);

    let newStatus = existingInvoice.status;
    if (newStatus !== "cancelled") {
      if (newBalanceDue === 0 && grandTotal > 0) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "dp_paid";
      } else {
        newStatus = "draft";
      }
    }

    // Update invoice with new totals
    await db.execute({
      sql: `
        UPDATE invoices SET
          dp_amount = ?,
          balance_due = ?,
          status = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?;
      `,
      args: [totalPaid, newBalanceDue, newStatus, now, id, user.id],
    });

    const updated = await getInvoiceById(user.id, id);

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentId,
        invoice_id: id,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes,
        created_at: now,
      },
      invoice: updated,
    });
  } catch (err: any) {
    console.error("Record payment error:", err);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran." },
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
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ error: "ID pembayaran wajib disertakan." }, { status: 400 });
  }

  try {
    await initDb();
    const db = getDb();

    await db.execute({
      sql: "DELETE FROM payments WHERE id = ? AND invoice_id = ?;",
      args: [paymentId, id],
    });

    // Recalculate
    const sumRes = await db.execute({
      sql: "SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?;",
      args: [id],
    });
    const totalPaid = Number(sumRes.rows[0]?.total_paid || 0);

    const existingInvoice = await getInvoiceById(user.id, id);
    if (!existingInvoice) {
      return NextResponse.json({ success: true });
    }

    const grandTotal = Math.max(0, existingInvoice.subtotal - existingInvoice.discount);
    const newBalanceDue = Math.max(0, grandTotal - totalPaid);

    let newStatus = existingInvoice.status;
    if (newStatus !== "cancelled") {
      if (newBalanceDue === 0 && grandTotal > 0) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "dp_paid";
      } else {
        newStatus = "draft";
      }
    }

    const now = Date.now();
    await db.execute({
      sql: `
        UPDATE invoices SET
          dp_amount = ?,
          balance_due = ?,
          status = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?;
      `,
      args: [totalPaid, newBalanceDue, newStatus, now, id, user.id],
    });

    const updated = await getInvoiceById(user.id, id);

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    console.error("Delete payment error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pembayaran." },
      { status: 500 }
    );
  }
}
