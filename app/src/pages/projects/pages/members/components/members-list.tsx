import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MoreHorizontal, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { MemberRoleFormOptions, MemberRoleRank, getMemberRoleLabel } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useRemoveMember, useUpdateMember } from "@/features/collaboration/hooks/use-collaboration";
import type { MemberRole, ProjectMember } from "@/features/collaboration/interfaces/collaboration.interfaces";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";

interface MembersListProps {
    projectId: string;
    myRole: MemberRole;
    members: ProjectMember[];
}

export const MembersList = ({ projectId, myRole, members }: MembersListProps) => {
    const navigate = useNavigate();
    const update = useUpdateMember();
    const remove = useRemoveMember();
    const [pendingRemoval, setPendingRemoval] = useState<ProjectMember | null>(null);
    const myRank = MemberRoleRank[myRole] ?? 1;
    const canManage = myRank >= MemberRoleRank.ADMIN;

    /** Mirrors server rules: managers can only modify members strictly below their own rank; the owner is immutable. */
    const canModify = (m: ProjectMember) => canManage && !m.is_me && m.role !== "OWNER" && (MemberRoleRank[m.role] ?? 0) < myRank;
    const assignableRoles = MemberRoleFormOptions.filter((o) => o.id !== "OWNER" && (myRole === "OWNER" || MemberRoleRank[o.id] < myRank));

    const confirmRemoval = () => {
        if (!pendingRemoval) return;
        remove.mutate(
            { projectId, userId: pendingRemoval.user.id },
            {
                onSuccess: () => {
                    const leaving = pendingRemoval.is_me;
                    setPendingRemoval(null);
                    if (leaving) navigate(Routes.projects.root);
                },
            },
        );
    };

    return (
        <>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {members.map((m) => {
                    const name = displayName(m.user);
                    const editable = canModify(m);
                    return (
                        <li key={m.user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <UserAvatar name={name} src={m.user.avatar_url} />
                                <div className="min-w-0">
                                    <p className="truncate font-medium">
                                        {name} {m.is_me ? <span className="text-muted-foreground">(you)</span> : null}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {m.user.email} · joined {formatDate(m.joined_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {editable ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`copy-${m.user.id}`}
                                                checked={m.can_copy}
                                                onCheckedChange={(v) => update.mutate({ projectId, userId: m.user.id, dto: { can_copy: v } })}
                                                aria-label={`Allow ${name} to copy content`}
                                            />
                                            <Label htmlFor={`copy-${m.user.id}`} className="text-xs text-muted-foreground">
                                                Copy
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`reshare-${m.user.id}`}
                                                checked={m.can_reshare}
                                                onCheckedChange={(v) => update.mutate({ projectId, userId: m.user.id, dto: { can_reshare: v } })}
                                                aria-label={`Allow ${name} to reshare content`}
                                            />
                                            <Label htmlFor={`reshare-${m.user.id}`} className="text-xs text-muted-foreground">
                                                Reshare
                                            </Label>
                                        </div>
                                    </>
                                ) : null}
                                <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{getMemberRoleLabel(m.role)}</Badge>
                                {editable || (m.is_me && m.role !== "OWNER") ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            {editable ? (
                                                <>
                                                    <DropdownMenuLabel>Change role</DropdownMenuLabel>
                                                    <DropdownMenuRadioGroup
                                                        value={m.role}
                                                        onValueChange={(role) => role !== m.role && update.mutate({ projectId, userId: m.user.id, dto: { role: role as Exclude<MemberRole, "OWNER"> } })}
                                                    >
                                                        {assignableRoles.map((o) => (
                                                            <DropdownMenuRadioItem key={o.id} value={o.id}>
                                                                {o.label}
                                                            </DropdownMenuRadioItem>
                                                        ))}
                                                    </DropdownMenuRadioGroup>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingRemoval(m)}>
                                                        <UserMinus className="mr-2 h-4 w-4" /> Remove access
                                                    </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingRemoval(m)}>
                                                    <LogOut className="mr-2 h-4 w-4" /> Leave project
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : null}
                            </div>
                        </li>
                    );
                })}
            </ul>
            <ConfirmationDialog
                isOpen={!!pendingRemoval}
                onClose={() => setPendingRemoval(null)}
                onConfirm={confirmRemoval}
                isLoading={remove.isPending}
                variant="destructive"
                title={pendingRemoval?.is_me ? "Leave this project?" : `Remove ${pendingRemoval ? displayName(pendingRemoval.user) : ""}?`}
                description={
                    pendingRemoval?.is_me
                        ? "You'll lose access to its material. Your own progress history is kept if you are invited back."
                        : "They will immediately lose access to this project and anything shared with them from it."
                }
                confirmText={pendingRemoval?.is_me ? "Leave" : "Remove"}
            />
        </>
    );
};
