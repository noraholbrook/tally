"use client";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function ConditionalNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <BottomNav />;
}
