import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationItem } from "@/components/ui/notification-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/routes";
import { getNotificationTypeLabel } from "@/config/constants/dropdowns/notifications/notification-type.options";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notification-count";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/notifications/hooks/use-notifications";

const isInternal = (link?: string | null) => !!link && link.startsWith("/") && !link.startsWith("//");

/** Header bell with a popover of the latest notifications; live via realtime query invalidation. */
export const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { data: count } = useUnreadNotificationCount();
    const unread = count?.count ?? 0;
    const { data, isPending } = useNotifications({ page: 1, limit: 8 }, open);
    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}>
                    <Bell />
                    {unread > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground" aria-hidden>
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="font-medium">Notifications</span>
                    <Button variant="ghost" size="sm" disabled={!unread} onClick={() => markAll.mutate()} loading={markAll.isPending}>
                        Mark all read
                    </Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-1.5">
                    {isPending ? (
                        <div className="space-y-2 p-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : !data?.data.length ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
                    ) : (
                        data.data.map((n) => (
                            <NotificationItem
                                key={n.id}
                                compact
                                type={n.type}
                                title={n.title}
                                body={n.body}
                                createdAt={n.created_at}
                                unread={!n.read_at}
                                typeLabel={getNotificationTypeLabel(n.type)}
                                onSelect={() => {
                                    if (!n.read_at) markRead.mutate(n.id);
                                    setOpen(false);
                                    if (isInternal(n.link)) navigate(n.link!);
                                }}
                            />
                        ))
                    )}
                </div>
                <div className="border-t border-border p-2">
                    <Button variant="ghost" className="w-full" asChild onClick={() => setOpen(false)}>
                        <Link to={Routes.notifications}>View all</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
