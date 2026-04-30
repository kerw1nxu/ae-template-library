import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-page">
      <div className="empty">
        <h2>模板不存在</h2>
        <p>这个模板可能已被删除，或你没有访问权限。</p>
        <Link href="/" className="button-link secondary">
          返回素材库
        </Link>
      </div>
    </main>
  );
}
