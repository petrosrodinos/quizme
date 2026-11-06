import { useState } from "react";
import { Building2, Check, Copy, Link2, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { displayName } from "@/lib/display-name";
import { getSharePermissionLabel, getShareResourceTypeLabel } from "@/config/constants/dropdowns/collaboration/share-form.options";
import { useRevokeShare, useShares } from "@/features/shares/hooks/use-shares";
import type { Share } from "@/features/shares/interfaces/shares.interfaces";
import { formatDate } from "@/lib/date";
import { useTranslation } from "react-i18next";

export const SharesList = ({ projectId }: { projectId: string }) => {
    const { t } = useTranslation("members");
    const { data, isPending } = useShares(projectId);
    const revoke = useRevokeShare();
    const [target, setTarget] = useState<Share | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (isPending) return <ListSkeleton rows={2} />;
    if (!data?.length) return <EmptyState compact icon={Link2} title={t("sharesList.empty.title")} description={t("sharesList.empty.description")} />;

    const copy = async (s: Share) => {
        if (!s.url) return;
        await navigator.clipboard.writeText(s.url);
        setCopiedId(s.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    return (
        <>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {data.map((s) => {
                    const Icon = s.target_type === "LINK" ? Link2 : s.target_type === "ORGANIZATION" ? Building2 : User;
                    const target = s.target_type === "LINK" ? t("sharesList.anyoneWithLink") : s.target_type === "ORGANIZATION" ? (s.organization?.name ?? t("sharesList.organization")) : s.target_user ? displayName(s.target_user) : t("sharesList.user");
                    return (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {t("sharesList.resourceToTarget", { resource: getShareResourceTypeLabel(s.resource_type), target })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(s.created_at)}
                                    {s.expires_at ? ` · ${t("sharesList.expires", { date: formatDate(s.expires_at) })}` : ""}
                                    {s.can_copy ? ` · ${t("sharesList.copyAllowed")}` : ""}
                                    {s.can_reshare ? ` · ${t("sharesList.reshareAllowed")}` : ""}
                                </p>
                            </div>
                            <Badge variant="outline">{getSharePermissionLabel(s.permission)}</Badge>
                            {s.url ? (
                                <Button variant="ghost" size="icon" onClick={() => copy(s)} aria-label={t("share.dialog.copyLink")}>
                                    {copiedId === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" onClick={() => setTarget(s)} aria-label={t("sharesList.revokeAria")}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <ConfirmationDialog
                isOpen={!!target}
                onClose={() => setTarget(null)}
                onConfirm={() => target && revoke.mutate(target.id, { onSuccess: () => setTarget(null) })}
                isLoading={revoke.isPending}
                variant="destructive"
                title={t("sharesList.confirm.title")}
                description={t("sharesList.confirm.description")}
                confirmText={t("sharesList.confirm.confirm")}
            />
        </>
    );
};
