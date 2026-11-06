import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { getMemberRoleLabel } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useRevokeInvitation } from "@/features/collaboration/hooks/use-collaboration";
import type { PendingInvitation } from "@/features/collaboration/interfaces/collaboration.interfaces";
import { formatDate } from "@/lib/date";
import { useTranslation } from "react-i18next";

interface PendingInvitationsProps {
    projectId: string;
    invitations: PendingInvitation[];
}

export const PendingInvitations = ({ projectId, invitations }: PendingInvitationsProps) => {
    const { t } = useTranslation("members");
    const revoke = useRevokeInvitation();
    const [target, setTarget] = useState<PendingInvitation | null>(null);
    if (!invitations.length) return null;
    return (
        <section aria-labelledby="pending-invitations" className="space-y-3">
            <h2 id="pending-invitations" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("pending.title")}
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-dashed border-border bg-surface/60">
                {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 p-3">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">{t("pending.expires", { date: formatDate(inv.expires_at) })}</p>
                        </div>
                        <Badge variant="outline">{getMemberRoleLabel(inv.role)}</Badge>
                        <Button variant="ghost" size="icon" aria-label={t("pending.revokeAria", { email: inv.email })} onClick={() => setTarget(inv)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </li>
                ))}
            </ul>
            <ConfirmationDialog
                isOpen={!!target}
                onClose={() => setTarget(null)}
                onConfirm={() => target && revoke.mutate({ projectId, invitationId: target.id }, { onSuccess: () => setTarget(null) })}
                isLoading={revoke.isPending}
                variant="destructive"
                title={t("pending.confirm.title")}
                description={t("pending.confirm.description", { email: target?.email ?? "" })}
                confirmText={t("pending.confirm.confirm")}
            />
        </section>
    );
};
