import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diverge — Cross-Platform Prediction Market Analytics",
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
        <TooltipProvider>
          <Nav />
          <main className="min-h-[calc(100vh-57px)]">{children}</main>
          <footer className="border-t border-white/10 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
              <div>diverge.market — cross-platform prediction market analytics</div>
              <div className="flex gap-4">
                <a href="https://x.com/zaenakai" className="hover:text-white transition">Twitter</a>
                <a href="#" className="hover:text-white transition">API Docs</a>
                <a href="#" className="hover:text-white transition">About</a>
              </div>
            </div>
          </footer>
        </TooltipProvider>
      </body>
    </html>
  );
}
