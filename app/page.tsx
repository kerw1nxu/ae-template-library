import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroups } from "@/lib/tags";
import { searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const [initialTemplates, initialTagGroups] = await Promise.all([
    searchTemplates({}, currentUser),
    getTagGroups(),
  ]);

  return (
    <HomeClient
      initialTemplates={initialTemplates}
      initialTagGroups={initialTagGroups}
      currentUser={currentUser}
    />
  );
}
