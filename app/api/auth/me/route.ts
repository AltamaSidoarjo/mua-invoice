import { NextResponse } from "next/server";
import { countUsers, getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export async function GET() {
  const userCount = await countUsers();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      profile: null,
      needsSetup: userCount === 0,
    });
  }

  const profile = await getProfile(user.id);

  return NextResponse.json({
    authenticated: true,
    user,
    profile,
    needsSetup: false,
  });
}
