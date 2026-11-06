import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { getMemberRoleLabel } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useRevokeInvitation } from "@/features/collaboration/hooks/use-collaboration";
import type { PendingInvitation } from "@/features/collaboration/interfaces/collaboration.interfaces";
import { formatDate } from "@/lib/date";

interface PendingInvitationsProps {
    projectId: string;
    invitations: PendingInvitation[];
}

export const PendingInvitations = ({ projectId, invitations }: PendingInvitationsProps) => {
    const revoke = useRevokeInvitation();
    const [target, setTarget] = useState<PendingInvitation | null>(null);
    if (!invitations.length) return null;
    return (
        <section aria-labelledby="pending-invitations" className="space-y-3">
            <h2 id="pending-invitations" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Pending invitations
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-dashed border-border bg-surface/60">
                {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 p-3">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">Expires {formatDate(inv.expires_at)}</p>
                        </div>
                        <Badge variant="outline">{getMemberRoleLabel(inv.role)}</Badge>
                        <Button variant="ghost" size="icon" aria-label={`Revoke invitation for ${inv.email}`} onClick={() => setTarget(inv)}>
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
                title="Revoke invitation?"
                description={`The link sent to ${target?.email ?? ""} will stop working.`}
                confirmText="Revoke"
            />
        </section>
    );
};
