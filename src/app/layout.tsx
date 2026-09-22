import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LVAEP Tutoring Logs",
  description:
    "Literacy Volunteers of America, Essex/Passaic County — student attendance & achievement tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">{children}</body>
    </html>
  );
}
