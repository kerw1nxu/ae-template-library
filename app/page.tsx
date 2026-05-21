import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const initialTemplates = await searchTemplates({}, currentUser);

  return (
    <HomeClient
      initialTemplates={initialTemplates}
      currentUser={currentUser}
    />
  );
}
