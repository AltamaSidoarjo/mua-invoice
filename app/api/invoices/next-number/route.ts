import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/invoice";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nextNumber = await generateInvoiceNumber(user.id);
  return NextResponse.json({ nextNumber });
}
