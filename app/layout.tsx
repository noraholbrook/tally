import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNav } from "@/components/layout/ConditionalNav";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { ensureSeeded } from "@/lib/seed-init";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tally — Split purchases with friends",
  description: "Track who owes what and settle up with Venmo",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tally" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e2128",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  try { await ensureSeeded(); } catch { /* db not available at build time */ }
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
            <main className="flex-1 pb-20">{children}</main>
            <ConditionalNav />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
