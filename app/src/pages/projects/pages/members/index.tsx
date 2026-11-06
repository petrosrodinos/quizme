import { useState } from "react";
import { Building2, Share2, UserPlus, Users } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useMembers } from "@/features/collaboration/hooks/use-collaboration";
import { MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useProjectContext } from "../../hooks/use-project-context";
import { MembersList } from "./components/members-list";
import { PendingInvitations } from "./components/pending-invitations";
import { InviteMemberDialog } from "./components/invite-member-dialog";
import { ShareDialog } from "./components/share-dialog";
import { SharesList } from "./components/shares-list";
import { OrganizationsDialog } from "./components/organizations-dialog";

export default function ProjectMembersPage() {
    const { project, projectId } = useProjectContext();
    usePageMetadata({ title: `${project.title} · Members` });
    const { data, isPending, isError, error } = useMembers(projectId);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [orgsOpen, setOrgsOpen] = useState(false);
    const myRole = data?.my_role ?? project.my_role;
    const canManage = (MemberRoleRank[myRole] ?? 1) >= MemberRoleRank.ADMIN;

    return (
        <Main>
            <PageHeader
                title="Members & sharing"
                description="Study together: invite collaborators, control what they can do, and share material."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setOrgsOpen(true)}>
                            <Building2 className="mr-2 h-4 w-4" /> Groups
                        </Button>
                        <Button variant="outline" onClick={() => setShareOpen(true)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                        {canManage ? (
                            <Button onClick={() => setInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" /> Invite
                            </Button>
                        ) : null}
                    </div>
                }
            />
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <section aria-labelledby="members-heading" className="space-y-4">
                    <h2 id="members-heading" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        People {data ? `(${data.members.length})` : ""}
                    </h2>
                    {isPending ? (
                        <ListSkeleton rows={3} />
                    ) : isError ? (
                        <EmptyState icon={Users} title="Couldn't load members" description={error?.message} />
                    ) : (
                        <>
                            <MembersList projectId={projectId} myRole={myRole} members={data.members} />
                            {canManage ? <PendingInvitations projectId={projectId} invitations={data.invitations} /> : null}
                        </>
                    )}
                </section>
                <section aria-labelledby="shares-heading" className="space-y-4">
                    <h2 id="shares-heading" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        Active shares
                    </h2>
                    <SharesList projectId={projectId} />
                </section>
            </div>
            <InviteMemberDialog projectId={projectId} myRole={myRole} open={inviteOpen} onOpenChange={setInviteOpen} />
            <ShareDialog projectId={projectId} open={shareOpen} onOpenChange={setShareOpen} />
            <OrganizationsDialog open={orgsOpen} onOpenChange={setOrgsOpen} />
        </Main>
    );
}
