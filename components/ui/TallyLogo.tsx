import { cn } from "@/lib/utils";

interface TallyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function TallyLogo({ className, size = "md" }: TallyLogoProps) {
  const sizes = {
    sm: { check: "text-base", text: "text-base", gap: "gap-0.5" },
    md: { check: "text-xl",   text: "text-xl",   gap: "gap-1" },
    lg: { check: "text-3xl",  text: "text-3xl",  gap: "gap-1.5" },
  };
  const s = sizes[size];

  return (
    <span className={cn("inline-flex items-baseline font-semibold tracking-tight text-foreground", s.gap, className)}>
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("shrink-0 translate-y-[0.5px]", size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-5 h-5" : "w-7 h-7")}
        aria-hidden
      >
        <polyline points="1.5,7.5 5,11 12.5,3" />
      </svg>
      <span className={cn("font-semibold lowercase", s.text)}>tally</span>
    </span>
  );
}
