import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(user.id);
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const updated = await updateProfile(user.id, data);
    return NextResponse.json({ success: true, profile: updated });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}
