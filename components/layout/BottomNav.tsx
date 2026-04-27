"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Clock, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/balances", icon: Users, label: "People" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/summary", icon: BarChart2, label: "Summary" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 backdrop-blur-sm border-t border-border safe-bottom z-40">
      <div className="flex items-center justify-around h-24 px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
