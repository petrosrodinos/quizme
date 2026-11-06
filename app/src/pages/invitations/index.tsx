import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Inbox, Share2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate, formatRelative } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { getMemberRoleLabel } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { getShareResourceTypeLabel } from "@/config/constants/dropdowns/collaboration/share-form.options";
import { useAcceptInvitation, useDeclineInvitation, useMyInvitations } from "@/features/invitations/hooks/use-invitations";
import { useSharedWithMe } from "@/features/shares/hooks/use-shares";

export default function InvitationsPage() {
    usePageMetadata({ title: "Invitations & shared" });
    const navigate = useNavigate();
    const invitations = useMyInvitations();
    const shared = useSharedWithMe();
    const accept = useAcceptInvitation();
    const decline = useDeclineInvitation();

    return (
        <Main>
            <PageHeader title="Invitations & shared with me" description="Join projects you've been invited to and open material others shared with you." />
            <div className="grid gap-8 lg:grid-cols-2">
                <section aria-labelledby="inv-heading" className="space-y-3">
                    <h2 id="inv-heading" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        Project invitations
                    </h2>
                    {invitations.isPending ? (
                        <ListSkeleton rows={2} />
                    ) : !invitations.data?.length ? (
                        <EmptyState compact icon={Inbox} title="No pending invitations" description="When someone invites you to a project it shows up here." />
                    ) : (
                        <ul className="space-y-3">
                            {invitations.data.map((inv) => (
                                <li key={inv.id} className="rounded-xl border border-border bg-card p-4">
                                    <div className="flex items-start gap-3">
                                        <UserAvatar name={inv.inviter ? displayName(inv.inviter) : "?"} src={inv.inviter?.avatar_url} />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">{inv.project.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {inv.inviter ? displayName(inv.inviter) : "Someone"} invited you · {formatRelative(inv.created_at)}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(inv.expires_at)}</p>
                                        </div>
                                        <Badge variant="secondary">{getMemberRoleLabel(inv.role)}</Badge>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" disabled={accept.isPending} loading={decline.isPending && decline.variables === inv.id} onClick={() => decline.mutate(inv.id)}>
                                            Decline
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={decline.isPending}
                                            loading={accept.isPending && accept.variables?.id === inv.id}
                                            onClick={() => accept.mutate({ id: inv.id }, { onSuccess: (r) => navigate(Routes.projects.detail(r.project_id)) })}
                                        >
                                            Accept & open
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section aria-labelledby="shared-heading" className="space-y-3">
                    <h2 id="shared-heading" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        Shared with me
                    </h2>
                    {shared.isPending ? (
                        <ListSkeleton rows={3} />
                    ) : !shared.data?.length ? (
                        <EmptyState compact icon={Share2} title="Nothing shared with you yet" description="Decks, quizzes and notes others share with you appear here." />
                    ) : (
                        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                            {shared.data.map((s) => (
                                <li key={s.id}>
                                    <Link
                                        to={Routes.shared_by_id(s.id)}
                                        className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{s.title}</p>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {getShareResourceTypeLabel(s.resource_type)} · from {s.sharer ? displayName(s.sharer) : "a collaborator"} · {formatRelative(s.created_at)}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Main>
    );
}
