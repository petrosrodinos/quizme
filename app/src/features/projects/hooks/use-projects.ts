import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
    createProject,
    deleteProject,
    duplicateProject,
    getProjectOverview,
    getProjectLanguages,
    getProjects,
    setProjectArchived,
    updateProject,
    uploadProjectCover,
} from "../services/projects.services";
import type { ProjectLanguage, ProjectQuery } from "../interfaces/projects.interfaces";
import { tr } from "@/lib/i18n-options";

export const useProjects = (query: ProjectQuery) =>
    useQuery({
        queryKey: ["projects", query],
        queryFn: () => getProjects(query),
    });

/** Languages offered by the project form; static fallback keeps the selector usable while loading / offline. */
const FALLBACK_LANGUAGES: ProjectLanguage[] = [
    { code: "en", name: "English", native_name: "English" },
    { code: "el", name: "Greek", native_name: "Ελληνικά" },
];

export const useProjectLanguages = () =>
    useQuery({
        queryKey: ["project-languages"],
        queryFn: getProjectLanguages,
        staleTime: Infinity,
        placeholderData: FALLBACK_LANGUAGES,
    });

export const useProjectOverview = (id: string | undefined) =>
    useQuery({
        queryKey: ["project-overview", id],
        queryFn: () => getProjectOverview(id!),
        enabled: !!id,
        retry: 1,
    });

const useInvalidateProjects = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["project"] });
        queryClient.invalidateQueries({ queryKey: ["project-overview"] });
    };
};

const onError = (titleKey: string) => (error: Error) => toast({ title: tr(titleKey), description: error.message, variant: "error" });

export const useCreateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: createProject,
        onSuccess: (p) => {
            invalidate();
            toast({ title: tr("projects:toasts.created.title"), description: tr("projects:toasts.created.description", { title: p.title }), duration: 2500 });
        },
        onError: onError("projects:toasts.createFailed"),
    });
};

export const useUpdateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("projects:toasts.updated"), duration: 2000 });
        },
        onError: onError("projects:toasts.updateFailed"),
    });
};

export const useDeleteProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("projects:toasts.deleted"), duration: 2000 });
        },
        onError: onError("projects:toasts.deleteFailed"),
    });
};

export const useArchiveProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: setProjectArchived,
        onSuccess: (_d, v) => {
            invalidate();
            toast({ title: v.archived ? tr("projects:toasts.archived") : tr("projects:toasts.restored"), duration: 2000 });
        },
        onError: onError("projects:toasts.archiveFailed"),
    });
};

export const useDuplicateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: duplicateProject,
        onSuccess: (p) => {
            invalidate();
            toast({ title: tr("projects:toasts.duplicated.title"), description: tr("projects:toasts.duplicated.description", { title: p.title }), duration: 2500 });
        },
        onError: onError("projects:toasts.duplicateFailed"),
    });
};

export const useUploadProjectCover = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: uploadProjectCover,
        onSuccess: () => {
            invalidate();
            toast({ title: tr("projects:toasts.coverUpdated"), duration: 2000 });
        },
        onError: onError("projects:toasts.coverFailed"),
    });
};
