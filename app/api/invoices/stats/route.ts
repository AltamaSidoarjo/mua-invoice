import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInvoiceStats } from "@/lib/invoice";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getInvoiceStats(user.id);
    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error("Invoice stats error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil statistik invoice." },
      { status: 500 }
    );
  }
}
