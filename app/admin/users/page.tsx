import type { Route } from "next";
import { redirect } from "next/navigation";
import { AdminUserPanel } from "@/components/admin-user-panel";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin/users" as Route);
  }
  if (user.role !== "admin") {
    redirect("/library" as Route);
  }

  const users = await listUsers();

  return (
    <main className="shell">
      <AppHeader user={user} />
      <AdminUserPanel users={users} currentUserId={user.id} />
    </main>
  );
}
