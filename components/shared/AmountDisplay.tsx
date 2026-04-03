import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/domain/splits";

interface AmountDisplayProps {
  cents: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({ cents, size = "md", showSign = false, className }: AmountDisplayProps) {
  const isPositive = cents >= 0;
  const sizeClasses = { sm: "text-sm", md: "text-base", lg: "text-xl font-bold", xl: "text-3xl font-bold" };

  return (
    <span className={cn(sizeClasses[size], isPositive ? "text-foreground" : "text-destructive", className)}>
      {showSign && isPositive && "+"}
      {formatCents(cents)}
    </span>
  );
}
