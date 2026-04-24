import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  if (user) {
    redirect(nextPath as never);
  }

  return (
    <main className="login-page">
      <Link href="/" className="brand login-brand">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-title">AE 模板库</span>
      </Link>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
