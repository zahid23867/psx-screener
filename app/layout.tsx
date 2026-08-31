import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSX Screener — KSE-100 Signals & Breakout Alerts",
  description:
    "Pakistan Stock Exchange screener with Buy/Sell signals, squeeze setups, and breakout alerts from delayed PSX data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
