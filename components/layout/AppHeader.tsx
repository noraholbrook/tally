"use client";
import { TallyLogo } from "@/components/ui/TallyLogo";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  /** Tab name shown below the logo */
  page: string;
  /** Optional right-side actions */
  right?: React.ReactNode;
  className?: string;
}

export function AppHeader({ page, right, className }: AppHeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-5 pt-10 pb-3",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <TallyLogo size="lg" />
          <span className="text-sm font-medium text-foreground/60 pl-0.5">{page}</span>
        </div>
        {right && <div className="pt-1">{right}</div>}
      </div>
    </div>
  );
}
