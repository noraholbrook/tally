import { cn } from "@/lib/utils";

interface TallyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function TallyLogo({ className, size = "md" }: TallyLogoProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3" : size === "md" ? "w-5 h-4" : "w-7 h-5";
  const textSize = size === "sm" ? "text-base" : size === "md" ? "text-xl" : "text-3xl";
  const gap = size === "sm" ? "gap-1" : size === "md" ? "gap-1.5" : "gap-2";

  return (
    <span className={cn("inline-flex items-center font-semibold tracking-tight text-foreground", gap, className)}>
      {/* Three horizontal tally lines */}
      <svg
        viewBox="0 0 16 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={cn("shrink-0", iconSize)}
        aria-hidden
      >
        <line x1="1" y1="2" x2="15" y2="2" />
        <line x1="1" y1="6" x2="15" y2="6" />
        <line x1="1" y1="10" x2="15" y2="10" />
      </svg>
      <span className={cn("font-semibold lowercase", textSize)}>tally</span>
    </span>
  );
}
