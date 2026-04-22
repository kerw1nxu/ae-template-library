import type { Route } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">AE Template Library</span>
          <h1>对外只开放介绍页，素材库内容仅向登录账号开放。</h1>
          <p>
            这个站点已经按“匿名仅首页、登录后访问素材库、管理员统一建号与维护内容”的方向改造。
            访客不能直接搜索、进入详情、预览视频或下载源文件。
          </p>
          <div className="landing-actions">
            <Link className="button-link" href={(user ? "/library" : "/login") as Route}>
              {user ? "进入素材库" : "账号登录"}
            </Link>
            {user?.role === "admin" ? (
              <Link className="button-link secondary" href={"/admin/content" as Route}>
                管理后台
              </Link>
            ) : null}
          </div>
        </div>

        <div className="landing-card">
          <h2>访问策略</h2>
          <ul className="policy-list">
            <li>匿名用户只能访问首页和登录页。</li>
            <li>成员账号可浏览模板、看详情、预览视频、下载源文件。</li>
            <li>管理员账号可上传、扫描导入、改标签、创建账号和重置密码。</li>
            <li>下载、预览、上传和登录接口都受限流与会话校验保护。</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
