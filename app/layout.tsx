import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/toaster";
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
  themeColor: "#7c3aed",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded();
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
