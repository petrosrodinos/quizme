import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
    createProject,
    deleteProject,
    duplicateProject,
    getProjectOverview,
    getProjects,
    setProjectArchived,
    updateProject,
    uploadProjectCover,
} from "../services/projects.services";
import type { ProjectQuery } from "../interfaces/projects.interfaces";

export const useProjects = (query: ProjectQuery) =>
    useQuery({
        queryKey: ["projects", query],
        queryFn: () => getProjects(query),
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

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

export const useCreateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: createProject,
        onSuccess: (p) => {
            invalidate();
            toast({ title: "Project created", description: `"${p.title}" is ready for your study material.`, duration: 2500 });
        },
        onError: onError("Could not create project"),
    });
};

export const useUpdateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: () => {
            invalidate();
            toast({ title: "Project updated", duration: 2000 });
        },
        onError: onError("Could not update project"),
    });
};

export const useDeleteProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            invalidate();
            toast({ title: "Project deleted", duration: 2000 });
        },
        onError: onError("Could not delete project"),
    });
};

export const useArchiveProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: setProjectArchived,
        onSuccess: (_d, v) => {
            invalidate();
            toast({ title: v.archived ? "Project archived" : "Project restored", duration: 2000 });
        },
        onError: onError("Could not change archive state"),
    });
};

export const useDuplicateProject = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: duplicateProject,
        onSuccess: (p) => {
            invalidate();
            toast({ title: "Project duplicated", description: `Created "${p.title}".`, duration: 2500 });
        },
        onError: onError("Could not duplicate project"),
    });
};

export const useUploadProjectCover = () => {
    const invalidate = useInvalidateProjects();
    return useMutation({
        mutationFn: uploadProjectCover,
        onSuccess: () => {
            invalidate();
            toast({ title: "Cover updated", duration: 2000 });
        },
        onError: onError("Could not upload cover"),
    });
};
