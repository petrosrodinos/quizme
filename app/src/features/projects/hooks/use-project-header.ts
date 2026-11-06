import { useQuery } from "@tanstack/react-query";
import { getProjectHeader } from "../services/project-header.services";

/** Shares the ["project", id] cache key so project detail mutations refresh the header too. */
export const useProjectHeader = (id: string | undefined) =>
    useQuery({
        queryKey: ["project", id],
        queryFn: () => getProjectHeader(id!),
        enabled: !!id,
        retry: (count, error) => count < 1 && !/not found/i.test(error.message),
    });
