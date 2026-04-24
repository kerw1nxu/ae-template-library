import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AE 模板库",
  description: "团队内部使用的 AE 模板搜索、预览、上传与下载站点。",
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
