import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name: string;
    src?: string | null;
    className?: string;
    /** Shows a small green dot (presence). */
    online?: boolean;
}

/** Presentational avatar with initials fallback and optional presence dot. */
export const UserAvatar = ({ name, src, className, online }: UserAvatarProps) => (
    <span className="relative inline-flex">
        <Avatar className={cn("h-9 w-9 border border-border", className)}>
            {src ? <AvatarImage src={src} alt="" /> : null}
            <AvatarFallback className="bg-surface-card text-xs font-medium text-foreground">{initials(name)}</AvatarFallback>
        </Avatar>
        {online ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" aria-hidden /> : null}
        <span className="sr-only">{name}</span>
    </span>
);

