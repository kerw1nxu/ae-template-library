import { HomeClient } from "@/components/home-client";
import { getTagGroups, searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [initialTemplates, initialTagGroups] = await Promise.all([
    searchTemplates(),
    getTagGroups(),
  ]);

  return (
    <main className="shell">
      <HomeClient initialTemplates={initialTemplates} initialTagGroups={initialTagGroups} />
    </main>
  );
}
