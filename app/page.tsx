import { redirect } from "next/navigation";
import { countUsers, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const totalUsers = await countUsers();
  if (totalUsers === 0) {
    redirect("/register");
  }

  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
