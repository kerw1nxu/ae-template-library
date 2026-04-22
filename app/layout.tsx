import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AE 模板库",
  description: "企业宣传、片头包装与栏目模板的内部检索与下载平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="site-root">{children}</body>
    </html>
  );
}
