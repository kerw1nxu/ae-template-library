import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AE 模板库",
  description: "一个面向团队内部账号开放的 AE 模板管理与检索站点。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
