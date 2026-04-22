import type { Route } from "next";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-shell">
      <div className="empty-page-card">
        <span className="section-overline">404</span>
        <h1>页面不存在，或当前账号没有访问入口。</h1>
        <p>你可以返回首页重新检索，也可以登录后进入模板素材库继续查找。</p>
        <div className="detail-action-row">
          <Link href={"/" as Route} className="secondary-button">
            返回首页
          </Link>
          <Link href={"/login" as Route} className="primary-button">
            前往登录
          </Link>
        </div>
      </div>
    </main>
  );
}
