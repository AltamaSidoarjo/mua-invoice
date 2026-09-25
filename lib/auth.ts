import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, initDb } from "./db";

export interface User {
  id: string;
  username: string;
  email: string | null;
  created_at: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_COOKIE_NAME = "mua_session";
const SESSION_DURATION_DAYS = 7;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedBuffer = Buffer.from(storedHash, "hex");
        if (storedBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(storedBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password minimal 8 karakter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password harus mengandung minimal satu huruf besar (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password harus mengandung minimal satu huruf kecil (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password harus mengandung minimal satu angka (0-9)." };
  }
  return { valid: true };
}

export async function countUsers(): Promise<number> {
  await initDb();
  const db = getDb();
  const result = await db.execute("SELECT COUNT(*) as count FROM users;");
  const count = Number(result.rows[0]?.count ?? 0);
  return count;
}

export async function createSession(userId: string): Promise<string> {
  await initDb();
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?);",
    args: [sessionId, userId, tokenHash, expiresAt, now],
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return rawToken;
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await initDb();
      const db = getDb();
      const tokenHash = hashToken(token);
      await db.execute({
        sql: "DELETE FROM sessions WHERE token_hash = ?;",
        args: [tokenHash],
      });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // ignore
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    await initDb();
    const db = getDb();
    const tokenHash = hashToken(token);
    const now = Date.now();

    const result = await db.execute({
      sql: `
        SELECT u.id, u.username, u.email, u.created_at, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ?;
      `,
      args: [tokenHash],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const expiresAt = Number(row.expires_at);

    if (expiresAt < now) {
      // Session expired, clean up
      await db.execute({
        sql: "DELETE FROM sessions WHERE token_hash = ?;",
        args: [tokenHash],
      });
      return null;
    }

    return {
      id: String(row.id),
      username: String(row.username),
      email: row.email ? String(row.email) : null,
      created_at: Number(row.created_at),
    };
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

export async function handleFailedLogin(userId: string, currentFailed: number): Promise<{ locked: boolean; message: string }> {
  const db = getDb();
  const newFailed = currentFailed + 1;
  const now = Date.now();

  if (newFailed >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
    await db.execute({
      sql: "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?;",
      args: [newFailed, lockedUntil, userId],
    });
    return {
      locked: true,
      message: `Akun terkunci sementara selama ${LOCKOUT_MINUTES} menit karena 5 kali percobaan login gagal berturut-turut.`,
    };
  } else {
    await db.execute({
      sql: "UPDATE users SET failed_attempts = ? WHERE id = ?;",
      args: [newFailed, userId],
    });
    const sisa = MAX_FAILED_ATTEMPTS - newFailed;
    return {
      locked: false,
      message: `Username atau password salah. Sisa kesempatan: ${sisa} kali sebelum akun dikunci.`,
    };
  }
}

export async function resetFailedLogin(userId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?;",
    args: [userId],
  });
}
