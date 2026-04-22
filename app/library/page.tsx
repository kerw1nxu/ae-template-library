import type { Route } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroups, searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/library" as Route);
  }

  const [initialTemplates, initialTagGroups] = await Promise.all([
    searchTemplates(),
    getTagGroups(),
  ]);

  return (
    <main className="shell">
      <AppHeader user={user} />
      <HomeClient
        initialTemplates={initialTemplates}
        initialTagGroups={initialTagGroups}
        currentUser={user}
        canManageContent={user.role === "admin"}
      />
    </main>
  );
}
