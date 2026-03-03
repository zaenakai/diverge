import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MarketDelta — Cross-Platform Prediction Market Analytics",
  description:
    "Compare Polymarket vs Kalshi: arbitrage scanner, accuracy leaderboard, whale tracking, and cross-platform analytics for prediction markets.",
  keywords: [
    "prediction markets",
    "polymarket",
    "kalshi",
    "arbitrage",
    "analytics",
    "prediction market accuracy",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
