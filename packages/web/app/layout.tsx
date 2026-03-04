import type { Metadata } from "next";
import { Inter, Comfortaa, Poppins, Quicksand } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });
const comfortaa = Comfortaa({ subsets: ["latin"], weight: ["300"], variable: "--font-logo" });
const poppins = Poppins({ subsets: ["latin"], weight: ["200", "300"], variable: "--font-logo-alt" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["300"], variable: "--font-logo-alt2" });

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Diverge — Cross-Platform Prediction Market Analytics",
    description: "Compare Polymarket vs Kalshi: arbitrage scanner, accuracy leaderboard, whale tracking.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${comfortaa.variable} ${poppins.variable} ${quicksand.variable} bg-[#0a0a0a] text-white antialiased`}>
        <Providers>
        <TooltipProvider>
          <Nav />
          <main className="min-h-[calc(100vh-57px)]">{children}</main>
          <footer className="border-t border-white/10 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
              <div><span className="font-[var(--font-logo)] tracking-[0.1em]">diverge</span>.market — cross-platform prediction market analytics</div>
              <div className="flex gap-4">
                <a href="https://x.com/zaenakai" className="hover:text-white transition">Twitter</a>
                <a href="#" className="hover:text-white transition">API Docs</a>
                <a href="#" className="hover:text-white transition">About</a>
              </div>
            </div>
          </footer>
        </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
