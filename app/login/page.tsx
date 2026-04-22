import type { Route } from "next";
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
    <main className="auth-shell">
      <div className="auth-panel">
        <div>
          <span className="eyebrow">登录</span>
          <h1>使用管理员创建的账号进入素材库。</h1>
          <p className="muted">
            当前站点不开放注册。若你需要账号，请联系管理员创建并分配初始密码。
          </p>
        </div>

        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
