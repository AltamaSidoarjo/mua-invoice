import { NextRequest, NextResponse } from "next/server";
import { countUsers, createSession, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { username, email, password, businessName } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username hanya boleh huruf, angka, titik, underscore, atau dash." },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordStrength(password || "");
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    // Security check: Only allow initial registration if 0 users exist,
    // or if the request is authorized by an existing admin.
    const userCount = await countUsers();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Pendaftaran publik ditutup. Aplikasi MUA ini dikunci untuk keamanan." },
        { status: 403 }
      );
    }

    const db = getDb();
    // Check if username already exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ? LIMIT 1;",
      args: [cleanUsername],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Username sudah digunakan." },
        { status: 400 }
      );
    }

    const { hash, salt } = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO users (id, username, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?);",
      args: [userId, cleanUsername, email?.trim() || null, hash, salt, now],
    });

    // Initialize MUA profile
    const profile = await getProfile(userId);
    if (businessName && businessName.trim()) {
      await db.execute({
        sql: "UPDATE mua_profile SET business_name = ? WHERE user_id = ?;",
        args: [businessName.trim(), userId],
      });
    }

    // Create session cookie
    await createSession(userId);

    return NextResponse.json({
      success: true,
      user: { id: userId, username: cleanUsername, email: email?.trim() || null },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan akun. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
