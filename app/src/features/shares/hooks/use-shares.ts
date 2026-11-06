import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { ShareResourceType } from "../interfaces/shares.interfaces";
import { copyShared, createShare, getShareableResources, getShares, getSharedView, getSharedWithMe, joinSharedProject, revokeShare } from "../services/shares.services";

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

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
            toast({ title: res.url ? "Share link created" : res.email ? "Invitation sent" : "Shared", duration: 2500 });
        },
        onError: onError("Could not share"),
    });
};

export const useRevokeShare = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: revokeShare,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["shares"] });
            toast({ title: "Share revoked", duration: 2000 });
        },
        onError: onError("Could not revoke share"),
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
            toast({ title: "You joined the project", duration: 2500 });
        },
        onError: onError("Could not join project"),
    });
};

export const useCopyShared = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: copyShared,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Copied to your project", duration: 2500 });
        },
        onError: onError("Could not copy"),
    });
};
