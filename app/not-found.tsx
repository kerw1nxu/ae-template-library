import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <div className="empty">
        <h2 style={{ marginTop: 0 }}>模板不存在</h2>
        <p>你访问的模板可能已被删除，或者链接地址不正确。</p>
        <Link href="/" className="button-link secondary">
          返回模板库
        </Link>
      </div>
    </main>
  );
}
