import type { FC, ReactNode } from "react";
import { Award, Bell, BookOpenCheck, CalendarDays, Flame, Layers, Target, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { useTranslation } from "react-i18next";

/** Visual icon per notification type (presentational only). */
const ICONS: Record<string, typeof Bell> = {
    study_reminder: Bell,
    flashcards_due: Layers,
    invitation: UserPlus,
    collaboration: Users,
    quiz_completed: BookOpenCheck,
    goal: Target,
    exam_upcoming: CalendarDays,
    streak_risk: Flame,
    achievement: Award,
};

interface NotificationItemProps {
    type: string;
    title: string;
    body?: string | null;
    createdAt: string;
    unread: boolean;
    typeLabel?: string;
    onSelect?: () => void;
    actions?: ReactNode;
    compact?: boolean;
}

export const NotificationItem: FC<NotificationItemProps> = ({ type, title, body, createdAt, unread, typeLabel, onSelect, actions, compact }) => {
    const { t } = useTranslation("ui");
    const Icon = ICONS[type] ?? Bell;
    return (
        <div className={cn("group flex items-start gap-3 rounded-lg", compact ? "p-2.5" : "p-4", unread ? "bg-primary/5" : "bg-transparent")}>
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", unread ? "bg-primary/15 text-primary" : "bg-surface-card text-muted-foreground")}>
                <Icon className="h-4 w-4" aria-hidden />
            </div>
            <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                <div className={cn("text-sm", unread ? "font-medium text-foreground" : "text-foreground/85")}>{title}</div>
                {body && <div className={cn("text-xs text-muted-foreground", compact && "line-clamp-2")}>{body}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">
                    {typeLabel ? `${typeLabel} · ` : ""}
                    {formatRelative(createdAt)}
                </div>
            </button>
            {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t("notification.unread")} />}
            {actions}
        </div>
    );
};
