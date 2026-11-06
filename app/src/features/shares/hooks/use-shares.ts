import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { ShareResourceType } from "../interfaces/shares.interfaces";
import { copyShared, createShare, getShareableResources, getShares, getSharedView, getSharedWithMe, joinSharedProject, revokeShare } from "../services/shares.services";
import { tr } from "@/lib/i18n-options";

const onError = (titleKey: string) => (error: Error) => toast({ title: tr(titleKey), description: error.message, variant: "error" });

export const useShares = (projectId: string, enabled = true) =>
    useQuery({ queryKey: ["shares", projectId], queryFn: () => getShares(projectId), enabled: !!projectId && enabled });

export const useShareableResources = (projectId: string, type: ShareResourceType, enabled: boolean) =>
    useQuery({ queryKey: ["shareable-resources", projectId, type], queryFn: () => getShareableResources(projectId, type), enabled: !!projectId && enabled });

export const useCreateShare = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createShare,
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["shares"] });
            qc.invalidateQueries({ queryKey: ["project-members"] });
            toast({ title: tr(res.url ? "members:share.toasts.linkCreated" : res.email ? "members:toasts.inviteSent.title" : "members:share.toasts.shared"), duration: 2500 });
        },
        onError: onError("members:share.toasts.shareFailed"),
    });
};

export const useRevokeShare = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: revokeShare,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["shares"] });
            toast({ title: tr("members:share.toasts.revoked"), duration: 2000 });
        },
        onError: onError("members:share.toasts.revokeFailed"),
    });
};

export const useSharedWithMe = () => useQuery({ queryKey: ["shared-with-me"], queryFn: getSharedWithMe });

export const useSharedView = (by: { token?: string; id?: string }) =>
    useQuery({ queryKey: ["shared-view", by.token ?? by.id], queryFn: () => getSharedView(by), enabled: !!(by.token || by.id), retry: false });

export const useJoinSharedProject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: joinSharedProject,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: tr("shared:toasts.joined"), duration: 2500 });
        },
        onError: onError("shared:toasts.joinFailed"),
    });
};

export const useCopyShared = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: copyShared,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: tr("shared:toasts.copied"), duration: 2500 });
        },
        onError: onError("shared:toasts.copyFailed"),
    });
};
