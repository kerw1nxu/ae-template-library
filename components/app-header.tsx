import type { Route } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/types";

type Props = {
  user: AuthUser;
};

export function AppHeader({ user }: Props) {
  return (
    <header className="app-header">
      <div>
        <div className="eyebrow">已登录</div>
        <div className="app-header-title">AE 模板库</div>
      </div>

      <nav className="app-header-nav">
        <Link href={"/library" as Route} className="button-link secondary">
          素材库
        </Link>
        {user.role === "admin" ? (
          <>
            <Link href={"/admin/content" as Route} className="button-link secondary">
              内容管理
            </Link>
            <Link href={"/admin/users" as Route} className="button-link secondary">
              账号管理
            </Link>
          </>
        ) : null}
        <span className="user-pill">
          {user.username} · {user.role === "admin" ? "管理员" : "成员"}
        </span>
        <LogoutButton />
      </nav>
    </header>
  );
}
