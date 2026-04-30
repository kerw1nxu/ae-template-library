import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AE 模板素材库",
  description: "用于管理、预览和下载 After Effects 模板素材的内部素材库。",
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
