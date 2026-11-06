import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationItem } from "@/components/ui/notification-item";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { getNotificationTypeLabel } from "@/config/constants/dropdowns/notifications/notification-type.options";
import { useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/notifications/hooks/use-notifications";
import type { AppNotification } from "@/features/notifications/interfaces/notifications.interfaces";

const PAGE_SIZE = 20;
const isInternal = (link?: string | null) => !!link && link.startsWith("/") && !link.startsWith("//");

export default function NotificationsPage() {
    usePageMetadata({ title: "Notifications" });
    const navigate = useNavigate();
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [toDelete, setToDelete] = useState<AppNotification | null>(null);
    const { data, isPending } = useNotifications({ page, limit: PAGE_SIZE, unread: unreadOnly });
    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();
    const remove = useDeleteNotification();

    const open = (n: AppNotification) => {
        if (!n.read_at) markRead.mutate(n.id);
        if (isInternal(n.link)) navigate(n.link!);
    };

    return (
        <Main width="narrow">
            <PageHeader
                title="Notifications"
                description="Reminders, results, invitations and achievements."
                actions={
                    <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
                        <CheckCheck /> Mark all read
                    </Button>
                }
            />
            <Tabs
                value={unreadOnly ? "unread" : "all"}
                onValueChange={(v) => {
                    setUnreadOnly(v === "unread");
                    setPage(1);
                }}
                className="mb-4"
            >
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                </TabsList>
            </Tabs>

            {isPending ? (
                <ListSkeleton rows={6} />
            ) : !data?.data.length ? (
                <EmptyState icon={BellOff} title={unreadOnly ? "You're all caught up" : "No notifications yet"} description="We'll let you know about due reviews, exams, results and invitations." />
            ) : (
                <>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {data.data.map((n) => (
                            <li key={n.id}>
                                <NotificationItem
                                    type={n.type}
                                    title={n.title}
                                    body={n.body}
                                    createdAt={n.created_at}
                                    unread={!n.read_at}
                                    typeLabel={getNotificationTypeLabel(n.type)}
                                    onSelect={() => open(n)}
                                    actions={
                                        <Button variant="ghost" size="icon" aria-label="Delete notification" onClick={() => setToDelete(n)}>
                                            <Trash2 />
                                        </Button>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                    {data.pagination.total_pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <Button variant="outline" size="sm" disabled={!data.pagination.has_prev} onClick={() => setPage((p) => p - 1)}>
                                Previous
                            </Button>
                            <span className="text-muted-foreground">
                                Page {data.pagination.page} of {data.pagination.total_pages}
                            </span>
                            <Button variant="outline" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage((p) => p + 1)}>
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title="Delete notification?"
                description="This notification will be removed permanently."
                confirmText="Delete"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
