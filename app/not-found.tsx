import type { Route } from "next";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <div className="empty">
        <h2 className="empty-title">页面不存在</h2>
        <p className="muted">你访问的内容不存在，或者当前账号没有这个页面的入口。</p>
        <div className="landing-actions">
          <Link href={"/" as Route} className="button-link secondary">
            返回首页
          </Link>
          <Link href={"/login" as Route} className="button-link">
            去登录
          </Link>
        </div>
      </div>
    </main>
  );
}
