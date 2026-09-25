import { getDb, initDb } from "./db";
import { MuaProfile } from "./types";
import crypto from "node:crypto";

const DEFAULT_TERMS = `1. Pembayaran DP (Down Payment) minimal 30% untuk mengunci jadwal acara.
2. Pelunasan sisa tagihan wajib diselesaikan maksimal H-3 sebelum hari acara.
3. Pembatalan sepihak dari pihak klien menyebabkan DP yang telah dibayarkan hangus.
4. Reschedule (perubahan tanggal) maksimal 1 kali dengan konfirmasi minimal H-14 dan bergantung pada ketersediaan jadwal MUA.
5. Harap menyediakan area make up dengan pencahayaan memadai dan stop kontak listrik.`;

const DEFAULT_NOTES = `Terima kasih telah mempercayakan momen istimewa Anda kepada kami! Mohon informasikan kepada kami sebelum hari H apabila Anda memiliki kondisi kulit sensitif atau riwayat alergi kosmetik tertentu.`;

export async function getProfile(userId: string): Promise<MuaProfile> {
  await initDb();
  const db = getDb();

  const res = await db.execute({
    sql: "SELECT * FROM mua_profile WHERE user_id = ? LIMIT 1;",
    args: [userId],
  });

  if (res.rows.length > 0) {
    const row = res.rows[0];
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      business_name: String(row.business_name || ""),
      owner_name: String(row.owner_name || ""),
      phone: String(row.phone || ""),
      instagram: String(row.instagram || ""),
      address: String(row.address || ""),
      bank_name: String(row.bank_name || ""),
      bank_account: String(row.bank_account || ""),
      bank_holder: String(row.bank_holder || ""),
      default_terms: String(row.default_terms ?? DEFAULT_TERMS),
      default_notes: String(row.default_notes ?? DEFAULT_NOTES),
      updated_at: Number(row.updated_at || Date.now()),
    };
  }

  // Create default initial profile
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `
      INSERT INTO mua_profile (
        id, user_id, business_name, owner_name, phone, instagram, address,
        bank_name, bank_account, bank_holder, default_terms, default_notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      id,
      userId,
      "Studio Make Up Artist",
      "Owner MUA",
      "",
      "",
      "",
      "BCA",
      "",
      "",
      DEFAULT_TERMS,
      DEFAULT_NOTES,
      now,
    ],
  });

  return {
    id,
    user_id: userId,
    business_name: "Studio Make Up Artist",
    owner_name: "Owner MUA",
    phone: "",
    instagram: "",
    address: "",
    bank_name: "BCA",
    bank_account: "",
    bank_holder: "",
    default_terms: DEFAULT_TERMS,
    default_notes: DEFAULT_NOTES,
    updated_at: now,
  };
}

export async function updateProfile(
  userId: string,
  data: Partial<Omit<MuaProfile, "id" | "user_id" | "updated_at">>
): Promise<MuaProfile> {
  await initDb();
  const db = getDb();
  const current = await getProfile(userId);
  const now = Date.now();

  const updated: MuaProfile = {
    ...current,
    business_name: data.business_name ?? current.business_name,
    owner_name: data.owner_name ?? current.owner_name,
    phone: data.phone ?? current.phone,
    instagram: data.instagram ?? current.instagram,
    address: data.address ?? current.address,
    bank_name: data.bank_name ?? current.bank_name,
    bank_account: data.bank_account ?? current.bank_account,
    bank_holder: data.bank_holder ?? current.bank_holder,
    default_terms: data.default_terms ?? current.default_terms,
    default_notes: data.default_notes ?? current.default_notes,
    updated_at: now,
  };

  await db.execute({
    sql: `
      UPDATE mua_profile SET
        business_name = ?,
        owner_name = ?,
        phone = ?,
        instagram = ?,
        address = ?,
        bank_name = ?,
        bank_account = ?,
        bank_holder = ?,
        default_terms = ?,
        default_notes = ?,
        updated_at = ?
      WHERE user_id = ?;
    `,
    args: [
      updated.business_name,
      updated.owner_name,
      updated.phone,
      updated.instagram,
      updated.address,
      updated.bank_name,
      updated.bank_account,
      updated.bank_holder,
      updated.default_terms,
      updated.default_notes,
      updated.updated_at,
      userId,
    ],
  });

  return updated;
}
