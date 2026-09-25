import { getDb, initDb } from "./db";
import { Invoice, InvoiceItem, InvoiceStatus } from "./types";
import crypto from "node:crypto";

export async function generateInvoiceNumber(userId: string): Promise<string> {
  await initDb();
  const db = getDb();
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const pattern = `INV-${dateStr}-%`;
  const res = await db.execute({
    sql: "SELECT COUNT(*) as count FROM invoices WHERE user_id = ? AND invoice_number LIKE ?;",
    args: [userId, pattern],
  });

  const count = Number(res.rows[0]?.count ?? 0) + 1;
  const seq = String(count).padStart(3, "0");
  return `INV-${dateStr}-${seq}`;
}

export async function listInvoices(
  userId: string,
  search?: string,
  status?: string
): Promise<Invoice[]> {
  await initDb();
  const db = getDb();

  let query = "SELECT * FROM invoices WHERE user_id = ?";
  const args: (string | number)[] = [userId];

  if (status && status !== "all") {
    query += " AND status = ?";
    args.push(status);
  }

  if (search && search.trim() !== "") {
    query += " AND (client_name LIKE ? OR invoice_number LIKE ? OR event_type LIKE ?)";
    const term = `%${search.trim()}%`;
    args.push(term, term, term);
  }

  query += " ORDER BY created_at DESC;";

  const res = await db.execute({ sql: query, args });

  return res.rows.map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    invoice_number: String(row.invoice_number),
    client_name: String(row.client_name),
    client_phone: String(row.client_phone || ""),
    event_type: String(row.event_type || ""),
    event_date: String(row.event_date || ""),
    event_time: String(row.event_time || ""),
    event_venue: String(row.event_venue || ""),
    issue_date: String(row.issue_date),
    due_date: String(row.due_date || ""),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    dp_amount: Number(row.dp_amount),
    balance_due: Number(row.balance_due),
    status: row.status as InvoiceStatus,
    notes: String(row.notes || ""),
    terms: String(row.terms || ""),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  }));
}

export async function getInvoiceById(
  userId: string,
  id: string
): Promise<Invoice | null> {
  await initDb();
  const db = getDb();

  const res = await db.execute({
    sql: "SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1;",
    args: [id, userId],
  });

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  const itemsRes = await db.execute({
    sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order ASC;",
    args: [id],
  });

  const items: InvoiceItem[] = itemsRes.rows.map((item) => ({
    id: String(item.id),
    invoice_id: String(item.invoice_id),
    item_order: Number(item.item_order),
    description: String(item.description),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
  }));

  const paymentsRes = await db.execute({
    sql: "SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC;",
    args: [id],
  });

  const payments: import("./types").Payment[] = paymentsRes.rows.map((p) => ({
    id: String(p.id),
    invoice_id: String(p.invoice_id),
    amount: Number(p.amount),
    payment_date: String(p.payment_date),
    payment_method: String(p.payment_method),
    notes: String(p.notes || ""),
    created_at: Number(p.created_at),
  }));

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    invoice_number: String(row.invoice_number),
    client_name: String(row.client_name),
    client_phone: String(row.client_phone || ""),
    event_type: String(row.event_type || ""),
    event_date: String(row.event_date || ""),
    event_time: String(row.event_time || ""),
    event_venue: String(row.event_venue || ""),
    issue_date: String(row.issue_date),
    due_date: String(row.due_date || ""),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    dp_amount: Number(row.dp_amount),
    balance_due: Number(row.balance_due),
    status: row.status as InvoiceStatus,
    notes: String(row.notes || ""),
    terms: String(row.terms || ""),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    items,
    payments,
  };
}

export async function getPublicInvoiceById(
  id: string
): Promise<{ invoice: Invoice; profile: import("./types").MuaProfile } | null> {
  await initDb();
  const db = getDb();

  const res = await db.execute({
    sql: "SELECT * FROM invoices WHERE id = ? LIMIT 1;",
    args: [id],
  });

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const userId = String(row.user_id);

  const itemsRes = await db.execute({
    sql: "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order ASC;",
    args: [id],
  });

  const items: InvoiceItem[] = itemsRes.rows.map((item) => ({
    id: String(item.id),
    invoice_id: String(item.invoice_id),
    item_order: Number(item.item_order),
    description: String(item.description),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
  }));

  const paymentsRes = await db.execute({
    sql: "SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC;",
    args: [id],
  });

  const payments: import("./types").Payment[] = paymentsRes.rows.map((p) => ({
    id: String(p.id),
    invoice_id: String(p.invoice_id),
    amount: Number(p.amount),
    payment_date: String(p.payment_date),
    payment_method: String(p.payment_method),
    notes: String(p.notes || ""),
    created_at: Number(p.created_at),
  }));

  const { getProfile } = await import("./profile");
  const profile = await getProfile(userId);

  return {
    invoice: {
      id: String(row.id),
      user_id: userId,
      invoice_number: String(row.invoice_number),
      client_name: String(row.client_name),
      client_phone: String(row.client_phone || ""),
      event_type: String(row.event_type || ""),
      event_date: String(row.event_date || ""),
      event_time: String(row.event_time || ""),
      event_venue: String(row.event_venue || ""),
      issue_date: String(row.issue_date),
      due_date: String(row.due_date || ""),
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      dp_amount: Number(row.dp_amount),
      balance_due: Number(row.balance_due),
      status: row.status as InvoiceStatus,
      notes: String(row.notes || ""),
      terms: String(row.terms || ""),
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      items,
      payments,
    },
    profile,
  };
}

export async function createInvoice(
  userId: string,
  data: {
    invoice_number?: string;
    client_name: string;
    client_phone?: string;
    event_type?: string;
    event_date?: string;
    event_time?: string;
    event_venue?: string;
    issue_date?: string;
    due_date?: string;
    discount?: number;
    dp_amount?: number;
    status?: InvoiceStatus;
    notes?: string;
    terms?: string;
    items: {
      description: string;
      quantity: number;
      unit_price: number;
    }[];
  }
): Promise<Invoice> {
  await initDb();
  const db = getDb();
  const now = Date.now();
  const id = crypto.randomUUID();

  const invoiceNumber = data.invoice_number?.trim() || (await generateInvoiceNumber(userId));
  const todayStr = new Date().toISOString().slice(0, 10);
  const issueDate = data.issue_date || todayStr;
  const dueDate = data.due_date || "";

  // Calculate items and subtotal
  let subtotal = 0;
  const processedItems: InvoiceItem[] = (data.items || []).map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const total = qty * price;
    subtotal += total;
    return {
      id: crypto.randomUUID(),
      invoice_id: id,
      item_order: index,
      description: item.description || "Layanan MUA",
      quantity: qty,
      unit_price: price,
      total_price: total,
    };
  });

  const discount = Math.max(0, Number(data.discount) || 0);
  const dpAmount = Math.max(0, Number(data.dp_amount) || 0);
  const balanceDue = Math.max(0, subtotal - discount - dpAmount);

  let initialStatus: InvoiceStatus = data.status || "draft";
  if (data.status === undefined || data.status === "draft") {
    if (balanceDue === 0 && subtotal > 0) {
      initialStatus = "paid";
    } else if (dpAmount > 0) {
      initialStatus = "dp_paid";
    }
  }

  const { getProfile } = await import("./profile");
  const profile = await getProfile(userId);
  const terms = data.terms !== undefined && data.terms !== null && data.terms !== "" ? data.terms : profile.default_terms;
  const notes = data.notes !== undefined && data.notes !== null && data.notes !== "" ? data.notes : profile.default_notes;

  // Insert invoice
  await db.execute({
    sql: `
      INSERT INTO invoices (
        id, user_id, invoice_number, client_name, client_phone,
        event_type, event_date, event_time, event_venue,
        issue_date, due_date, subtotal, discount, dp_amount, balance_due,
        status, notes, terms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      id,
      userId,
      invoiceNumber,
      data.client_name,
      data.client_phone || "",
      data.event_type || "Wedding",
      data.event_date || "",
      data.event_time || "",
      data.event_venue || "",
      issueDate,
      dueDate,
      subtotal,
      discount,
      dpAmount,
      balanceDue,
      initialStatus,
      notes || "",
      terms || "",
      now,
      now,
    ],
  });

  // Insert items
  for (const it of processedItems) {
    await db.execute({
      sql: `
        INSERT INTO invoice_items (
          id, invoice_id, item_order, description, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      args: [it.id!, id, it.item_order, it.description, it.quantity, it.unit_price, it.total_price],
    });
  }

  return {
    id,
    user_id: userId,
    invoice_number: invoiceNumber,
    client_name: data.client_name,
    client_phone: data.client_phone || "",
    event_type: data.event_type || "Wedding",
    event_date: data.event_date || "",
    event_time: data.event_time || "",
    event_venue: data.event_venue || "",
    issue_date: issueDate,
    due_date: dueDate,
    subtotal,
    discount,
    dp_amount: dpAmount,
    balance_due: balanceDue,
    status: initialStatus,
    notes: data.notes || "",
    terms: data.terms || "",
    created_at: now,
    updated_at: now,
    items: processedItems,
  };
}

export async function updateInvoice(
  userId: string,
  id: string,
  data: {
    invoice_number?: string;
    client_name?: string;
    client_phone?: string;
    event_type?: string;
    event_date?: string;
    event_time?: string;
    event_venue?: string;
    issue_date?: string;
    due_date?: string;
    discount?: number;
    dp_amount?: number;
    status?: InvoiceStatus;
    notes?: string;
    terms?: string;
    items?: {
      description: string;
      quantity: number;
      unit_price: number;
    }[];
  }
): Promise<Invoice | null> {
  const existing = await getInvoiceById(userId, id);
  if (!existing) return null;

  await initDb();
  const db = getDb();
  const now = Date.now();

  let subtotal = existing.subtotal;
  let processedItems = existing.items || [];

  if (data.items) {
    subtotal = 0;
    processedItems = data.items.map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const total = qty * price;
      subtotal += total;
      return {
        id: crypto.randomUUID(),
        invoice_id: id,
        item_order: index,
        description: item.description || "Layanan MUA",
        quantity: qty,
        unit_price: price,
        total_price: total,
      };
    });

    // Replace items in DB
    await db.execute({
      sql: "DELETE FROM invoice_items WHERE invoice_id = ?;",
      args: [id],
    });

    for (const it of processedItems) {
      await db.execute({
        sql: `
          INSERT INTO invoice_items (
            id, invoice_id, item_order, description, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        args: [it.id!, id, it.item_order, it.description, it.quantity, it.unit_price, it.total_price],
      });
    }
  }

  const discount = data.discount !== undefined ? Number(data.discount) : existing.discount;
  const dpAmount = data.dp_amount !== undefined ? Number(data.dp_amount) : existing.dp_amount;
  const balanceDue = Math.max(0, subtotal - discount - dpAmount);

  const status = data.status || existing.status;

  await db.execute({
    sql: `
      UPDATE invoices SET
        invoice_number = ?,
        client_name = ?,
        client_phone = ?,
        event_type = ?,
        event_date = ?,
        event_time = ?,
        event_venue = ?,
        issue_date = ?,
        due_date = ?,
        subtotal = ?,
        discount = ?,
        dp_amount = ?,
        balance_due = ?,
        status = ?,
        notes = ?,
        terms = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?;
    `,
    args: [
      data.invoice_number ?? existing.invoice_number,
      data.client_name ?? existing.client_name,
      data.client_phone ?? existing.client_phone,
      data.event_type ?? existing.event_type,
      data.event_date ?? existing.event_date,
      data.event_time ?? existing.event_time,
      data.event_venue ?? existing.event_venue,
      data.issue_date ?? existing.issue_date,
      data.due_date ?? existing.due_date,
      subtotal,
      discount,
      dpAmount,
      balanceDue,
      status,
      data.notes ?? existing.notes,
      data.terms ?? existing.terms,
      now,
      id,
      userId,
    ],
  });

  return getInvoiceById(userId, id);
}

export async function deleteInvoice(userId: string, id: string): Promise<boolean> {
  await initDb();
  const db = getDb();
  const res = await db.execute({
    sql: "DELETE FROM invoices WHERE id = ? AND user_id = ?;",
    args: [id, userId],
  });
  return (res.rowsAffected ?? 0) > 0;
}

export async function getInvoiceStats(userId: string) {
  await initDb();
  const db = getDb();

  const res = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as count_paid,
        SUM(CASE WHEN status = 'dp_paid' THEN 1 ELSE 0 END) as count_dp,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as count_draft,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as count_cancelled,
        SUM(subtotal - discount) as total_volume,
        SUM(CASE WHEN status = 'paid' THEN (subtotal - discount) ELSE dp_amount END) as total_collected,
        SUM(balance_due) as total_pending
      FROM invoices
      WHERE user_id = ? AND status != 'cancelled';
    `,
    args: [userId],
  });

  const row = res.rows[0] || {};
  return {
    totalInvoices: Number(row.total_invoices || 0),
    countPaid: Number(row.count_paid || 0),
    countDp: Number(row.count_dp || 0),
    countDraft: Number(row.count_draft || 0),
    countCancelled: Number(row.count_cancelled || 0),
    totalVolume: Number(row.total_volume || 0),
    totalCollected: Number(row.total_collected || 0),
    totalPending: Number(row.total_pending || 0),
  };
}
