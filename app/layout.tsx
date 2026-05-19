import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Decision Insight",
  description: "LLM-powered analysis for complex decisions."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className="min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  );
}
