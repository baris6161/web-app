import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Angeschriebene Inserate",
  description: "Übersicht & No-Hand Steuerung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
