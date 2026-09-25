import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Password saat ini dan password baru wajib diisi." },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();
    const res = await db.execute({
      sql: "SELECT password_hash, salt FROM users WHERE id = ?;",
      args: [user.id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const row = res.rows[0];
    const isCurrentValid = await verifyPassword(
      String(currentPassword),
      String(row.password_hash),
      String(row.salt)
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Password saat ini tidak sesuai." },
        { status: 400 }
      );
    }

    const { hash, salt } = await hashPassword(newPassword);
    await db.execute({
      sql: "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;",
      args: [hash, salt, user.id],
    });

    return NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui.",
    });
  } catch (err: any) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Gagal mengganti password." },
      { status: 500 }
    );
  }
}
