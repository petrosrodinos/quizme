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

export const SharesList = ({ projectId }: { projectId: string }) => {
    const { data, isPending } = useShares(projectId);
    const revoke = useRevokeShare();
    const [target, setTarget] = useState<Share | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (isPending) return <ListSkeleton rows={2} />;
    if (!data?.length) return <EmptyState compact icon={Link2} title="Nothing shared yet" description="Share links, decks, quizzes and notes from here." />;

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
                    const target = s.target_type === "LINK" ? "Anyone with the link" : s.target_type === "ORGANIZATION" ? (s.organization?.name ?? "Organization") : s.target_user ? displayName(s.target_user) : "User";
                    return (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {getShareResourceTypeLabel(s.resource_type)} → {target}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(s.created_at)}
                                    {s.expires_at ? ` · expires ${formatDate(s.expires_at)}` : ""}
                                    {s.can_copy ? " · copy allowed" : ""}
                                    {s.can_reshare ? " · reshare allowed" : ""}
                                </p>
                            </div>
                            <Badge variant="outline">{getSharePermissionLabel(s.permission)}</Badge>
                            {s.url ? (
                                <Button variant="ghost" size="icon" onClick={() => copy(s)} aria-label="Copy link">
                                    {copiedId === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" onClick={() => setTarget(s)} aria-label="Revoke share">
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
                title="Revoke this share?"
                description="People using it will lose access immediately."
                confirmText="Revoke"
            />
        </>
    );
};
