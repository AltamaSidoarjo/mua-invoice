import { createClient, type Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __libsql_client: Client | undefined;
  // eslint-disable-next-line no-var
  var __db_initialized: Promise<void> | undefined;
}

export function getDb(): Client {
  if (global.__libsql_client) {
    return global.__libsql_client;
  }

  const url = process.env.TURSO_DATABASE_URL || "file:mua_invoice.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  const client = createClient({
    url,
    authToken,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__libsql_client = client;
  }

  return client;
}

export async function initDb(): Promise<void> {
  if (global.__db_initialized) {
    return global.__db_initialized;
  }

  const runInit = async () => {
    const db = getDb();

    // Enable foreign keys
    try {
      await db.execute("PRAGMA foreign_keys = ON;");
    } catch {
      // libSQL serverless might ignore pragma, safe to ignore
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        failed_attempts INTEGER DEFAULT 0,
        locked_until INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS mua_profile (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_name TEXT NOT NULL,
        owner_name TEXT,
        phone TEXT,
        instagram TEXT,
        address TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_holder TEXT,
        default_terms TEXT,
        default_notes TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        event_type TEXT,
        event_date TEXT,
        event_time TEXT,
        event_venue TEXT,
        issue_date TEXT NOT NULL,
        due_date TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        dp_amount REAL NOT NULL DEFAULT 0,
        balance_due REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        notes TEXT,
        terms TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        item_order INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        total_price REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    `);
  };

  global.__db_initialized = runInit();
  return global.__db_initialized;
}
