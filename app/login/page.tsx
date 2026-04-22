import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const nextPath = sanitizeNextPath(params.next);

  if (user) {
    redirect(nextPath as Route);
  }

  return (
    <main className="site-shell">
      <header className="platform-header">
        <div className="platform-header-inner">
          <Link href={"/" as Route} className="platform-brand">
            <span className="platform-brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="platform-brand-text">光帧模板库</span>
          </Link>

          <nav className="platform-nav">
            <Link href={"/" as Route} className="platform-nav-link">
              首页
            </Link>
            <Link href={"/login" as Route} className="platform-nav-link active">
              登录
            </Link>
          </nav>

          <div className="platform-header-tools">
            <Link href={"/" as Route} className="header-search-chip">
              返回首页
            </Link>
          </div>
        </div>
      </header>

      <section className="login-stage">
        <div className="login-copy">
          <span className="section-overline">账号登录</span>
          <h1>登录后进入素材库。</h1>
        </div>

        <div className="login-panel">
          <div className="login-panel-head">
            <h2>继续访问</h2>
          </div>
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
