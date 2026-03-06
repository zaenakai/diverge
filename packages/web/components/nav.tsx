"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/compare", label: "Compare" },
  { href: "/arbs", label: "Arb Scanner" },
  { href: "/accuracy", label: "Accuracy" },
  { href: "/api-docs", label: "API" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/favicon-src.png" alt="Diverge" width={28} height={28} className="rounded-md" />
            <span className="font-[var(--font-logo)] font-light text-xl tracking-[0.15em]">diverge</span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest ml-1">Beta</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? "text-white bg-white/[0.08]"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/pricing">
              <Badge variant="outline" className="ml-2 border-emerald-500/30 text-emerald-400 text-[10px] cursor-pointer hover:bg-emerald-500/10">
                PRO
              </Badge>
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
                Get Pro
              </Button>
            </Link>
          </div>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="text-white/60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0a0a0a] border-white/10 w-64">
              <div className="flex flex-col gap-1 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      pathname === item.href
                        ? "text-white bg-white/[0.08]"
                        : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-white/10 mt-4 pt-4 flex flex-col gap-2 px-4">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="ghost" size="sm" className="text-white/50 justify-start w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/pricing" onClick={() => setOpen(false)}>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                      Get Pro
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
