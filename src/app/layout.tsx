import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "IPO Radar — IPO intelligence", description: "Follow IPO filings, pricing and upcoming listings in one place." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
