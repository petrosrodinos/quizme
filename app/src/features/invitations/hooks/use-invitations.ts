import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { acceptInvitation, acceptInvitationByToken, declineInvitation, getInvitationPreview, getMyInvitations } from "../services/invitations.services";

export const useMyInvitations = () => useQuery({ queryKey: ["invitations"], queryFn: getMyInvitations });

export const useInvitationPreview = (token: string | undefined) =>
    useQuery({ queryKey: ["invitation-preview", token], queryFn: () => getInvitationPreview(token!), enabled: !!token, retry: false });

const useInvalidate = () => {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: ["invitations"] });
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
    };
};

export const useAcceptInvitation = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (by: { id?: string; token?: string }) => (by.token ? acceptInvitationByToken(by.token) : acceptInvitation(by.id!)),
        onSuccess: () => {
            invalidate();
            toast({ title: "Welcome aboard", description: "You joined the project.", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not accept invitation", description: error.message, variant: "error" }),
    });
};

export const useDeclineInvitation = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: declineInvitation,
        onSuccess: () => {
            invalidate();
            toast({ title: "Invitation declined", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not decline invitation", description: error.message, variant: "error" }),
    });
};
