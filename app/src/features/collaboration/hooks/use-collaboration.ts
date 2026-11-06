import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMembers, inviteMember, removeMember, revokeInvitation, updateMember } from "../services/collaboration.services";
import { tr } from "@/lib/i18n-options";

const onError = (titleKey: string) => (error: Error) => toast({ title: tr(titleKey), description: error.message, variant: "error" });

export const useMembers = (projectId: string) =>
    useQuery({ queryKey: ["project-members", projectId], queryFn: () => getMembers(projectId), enabled: !!projectId });

export const useInviteMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: inviteMember,
        onSuccess: (inv) => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: tr("members:toasts.inviteSent.title"), description: tr("members:toasts.inviteSent.description", { email: inv.email }), duration: 2500 });
        },
        onError: onError("members:toasts.inviteFailed"),
    });
};

export const useRevokeInvitation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: revokeInvitation,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: tr("members:toasts.invitationRevoked"), duration: 2000 });
        },
        onError: onError("members:toasts.revokeInvitationFailed"),
    });
};

export const useUpdateMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: tr("members:toasts.memberUpdated"), duration: 2000 });
        },
        onError: onError("members:toasts.updateMemberFailed"),
    });
};

export const useRemoveMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: tr("members:toasts.accessRemoved"), duration: 2000 });
        },
        onError: onError("members:toasts.removeMemberFailed"),
    });
};
