import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation("notifications");
    usePageMetadata({ title: t("pageTitle") });
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
                title={t("pageTitle")}
                description={t("description")}
                actions={
                    <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
                        <CheckCheck /> {t("markAllRead")}
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
                    <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
                    <TabsTrigger value="unread">{t("tabs.unread")}</TabsTrigger>
                </TabsList>
            </Tabs>

            {isPending ? (
                <ListSkeleton rows={6} />
            ) : !data?.data.length ? (
                <EmptyState icon={BellOff} title={unreadOnly ? t("empty.caughtUp") : t("empty.title")} description={t("empty.description")} />
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
                                        <Button variant="ghost" size="icon" aria-label={t("delete.aria")} onClick={() => setToDelete(n)}>
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
                                {t("common:actions.previous")}
                            </Button>
                            <span className="text-muted-foreground">
                                {t("pagination", { page: data.pagination.page, total: data.pagination.total_pages })}
                            </span>
                            <Button variant="outline" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage((p) => p + 1)}>
                                {t("common:actions.next")}
                            </Button>
                        </div>
                    )}
                </>
            )}
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
                title={t("delete.title")}
                description={t("delete.description")}
                confirmText={t("common:actions.delete")}
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
