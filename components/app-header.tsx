import type { Route } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/types";

type Props = {
  user: AuthUser;
  active?: "library" | "admin-users" | "detail";
};

export function AppHeader({ user, active = "library" }: Props) {
  const navItems = [
    { href: "/library" as Route, label: "找模板", key: "library" as const },
    ...(user.role === "admin"
      ? [{ href: "/admin/users" as Route, label: "用户管理", key: "admin-users" as const }]
      : []),
  ];

  return (
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
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`platform-nav-link${active === item.key ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="platform-header-tools">
          <span className="header-user-balance">已登录</span>
          <span className="header-avatar-pill" title={user.username}>
            {user.role === "admin" ? "管" : user.username.slice(0, 1).toUpperCase()}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
