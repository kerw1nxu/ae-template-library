import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/library" as Route);
  }

  redirect("/library" as Route);
}
