import { useNavigate, useParams } from "react-router-dom";
import { MailCheck, ShieldAlert } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { getMemberRoleLabel, MemberRoleFormOptions } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useAcceptInvitation, useInvitationPreview } from "@/features/invitations/hooks/use-invitations";

export default function InvitationAcceptPage() {
    usePageMetadata({ title: "Project invitation" });
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const me = useAuthStore((s) => s.user);
    const logout = useLogout();
    const preview = useInvitationPreview(token);
    const accept = useAcceptInvitation();

    if (preview.isPending)
        return (
            <Main width="narrow">
                <DetailSkeleton />
            </Main>
        );

    if (preview.isError) {
        const wrongAccount = /sent to/i.test(preview.error.message);
        return (
            <Main width="narrow">
                <EmptyState
                    icon={ShieldAlert}
                    title={wrongAccount ? "This invitation is for a different account" : "Invitation unavailable"}
                    description={
                        <span className="block space-y-2">
                            <span className="block">{preview.error.message}</span>
                            {wrongAccount ? <span className="block">You're signed in as {me?.email}. Sign out, then open the invitation link again with the invited account.</span> : null}
                        </span>
                    }
                    action={
                        wrongAccount ? (
                            <Button variant="outline" onClick={() => logout.mutate()} loading={logout.isPending}>
                                Sign out and switch account
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate(Routes.invitations)}>
                                View my invitations
                            </Button>
                        )
                    }
                />
            </Main>
        );
    }

    const inv = preview.data;
    return (
        <Main width="narrow">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
                <p className="mt-4 text-sm uppercase tracking-wider text-muted-foreground">You're invited to study</p>
                <h1 className="mt-2 font-display text-3xl">{inv.project.title}</h1>
                {inv.project.subject ? <p className="mt-1 text-muted-foreground">{inv.project.subject}</p> : null}
                {inv.project.description ? <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">{inv.project.description}</p> : null}
                {inv.inviter ? (
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-card px-3 py-1.5">
                        <UserAvatar name={displayName(inv.inviter)} src={inv.inviter.avatar_url} className="h-6 w-6" />
                        <span className="text-sm">Invited by {displayName(inv.inviter)}</span>
                    </div>
                ) : null}
                <div className="mt-6 space-y-1">
                    <Badge variant="secondary">{getMemberRoleLabel(inv.role)}</Badge>
                    <p className="text-sm text-muted-foreground">{MemberRoleFormOptions.find((o) => o.id === inv.role)?.description}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(inv.expires_at)}</p>
                </div>
                <div className="mt-8 flex justify-center gap-3">
                    <Button variant="ghost" onClick={() => navigate(Routes.dashboard)}>
                        Not now
                    </Button>
                    <Button loading={accept.isPending} onClick={() => token && accept.mutate({ token }, { onSuccess: (r) => navigate(Routes.projects.detail(r.project_id), { replace: true }) })}>
                        Accept invitation
                    </Button>
                </div>
            </div>
        </Main>
    );
}
