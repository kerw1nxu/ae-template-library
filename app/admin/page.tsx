import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin-client";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroups } from "@/lib/tags";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent("/admin")}` as never);
  }
  if (currentUser.role !== "admin") {
    redirect("/");
  }

  const [users, tagGroups] = await Promise.all([
    listUsers(),
    getTagGroups({ includeDisabled: true }),
  ]);

  return (
    <main className="site-page admin-page">
      <header className="admin-header">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-title">AE 模板素材库</span>
          </Link>
          <div>
            <p className="eyebrow">Admin console</p>
            <h1>后台管理</h1>
          </div>
        </div>
        <Link className="ghost-button" href="/">
          返回素材库
        </Link>
      </header>
      <AdminClient initialUsers={users} initialTagGroups={tagGroups} />
    </main>
  );
}
