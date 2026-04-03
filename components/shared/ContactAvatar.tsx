import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarColor, cn } from "@/lib/utils";

interface ContactAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ContactAvatar({ name, avatarUrl, size = "md", className }: ContactAvatarProps) {
  const sizeClasses = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={cn(getAvatarColor(name), "text-white font-semibold")}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
