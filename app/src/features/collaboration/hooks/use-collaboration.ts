import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMembers, inviteMember, removeMember, revokeInvitation, updateMember } from "../services/collaboration.services";

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

export const useMembers = (projectId: string) =>
    useQuery({ queryKey: ["project-members", projectId], queryFn: () => getMembers(projectId), enabled: !!projectId });

export const useInviteMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: inviteMember,
        onSuccess: (inv) => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: "Invitation sent", description: `${inv.email} will receive an email to join.`, duration: 2500 });
        },
        onError: onError("Could not send invitation"),
    });
};

export const useRevokeInvitation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: revokeInvitation,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: "Invitation revoked", duration: 2000 });
        },
        onError: onError("Could not revoke invitation"),
    });
};

export const useUpdateMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: "Member updated", duration: 2000 });
        },
        onError: onError("Could not update member"),
    });
};

export const useRemoveMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["project-members"] });
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Access removed", duration: 2000 });
        },
        onError: onError("Could not remove member"),
    });
};
