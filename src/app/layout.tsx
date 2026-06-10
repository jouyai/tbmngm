import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bot Platform",
  description: "Kelola banyak bot Telegram dari satu dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
