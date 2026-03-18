import type { Metadata } from "next";
import "./globals.css";
import "./ui.css";
export const metadata: Metadata = {
  title: "Open Exam",
  description: "Nền tảng tạo và tham gia bài kiểm tra trực tuyến",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
