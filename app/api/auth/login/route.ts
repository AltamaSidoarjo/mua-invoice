import { NextRequest, NextResponse } from "next/server";
import { createSession, handleFailedLogin, resetFailedLogin, verifyPassword } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const db = getDb();
    const cleanId = String(identifier).trim().toLowerCase();

    // Query user by username or email
    const res = await db.execute({
      sql: "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1;",
      args: [cleanId, cleanId],
    });

    if (res.rows.length === 0) {
      // Return generic message to prevent username enumeration
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const user = res.rows[0];
    const userId = String(user.id);
    const lockedUntil = Number(user.locked_until || 0);
    const failedAttempts = Number(user.failed_attempts || 0);
    const now = Date.now();

    // Check account lockout
    if (lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockedUntil - now) / (60 * 1000));
      return NextResponse.json(
        {
          error: `Akun terkunci demi keamanan. Silakan tunggu ${remainingMinutes} menit lagi sebelum mencoba kembali.`,
        },
        { status: 423 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(
      String(password),
      String(user.password_hash),
      String(user.salt)
    );

    if (!isValid) {
      const lockStatus = await handleFailedLogin(userId, failedAttempts);
      return NextResponse.json(
        { error: lockStatus.message },
        { status: 401 }
      );
    }

    // Login successful
    await resetFailedLogin(userId);
    await createSession(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: String(user.username),
        email: user.email ? String(user.email) : null,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat login." },
      { status: 500 }
    );
  }
}
