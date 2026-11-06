import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { addOrganizationMember, createOrganization, getOrganizationMembers, getOrganizations, removeOrganizationMember } from "../services/organizations.services";

const onError = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

export const useOrganizations = () => useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });

export const useOrganizationMembers = (id: string | null) =>
    useQuery({ queryKey: ["organization-members", id], queryFn: () => getOrganizationMembers(id!), enabled: !!id });

export const useCreateOrganization = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createOrganization,
        onSuccess: (o) => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            toast({ title: "Organization created", description: o.name, duration: 2000 });
        },
        onError: onError("Could not create organization"),
    });
};

export const useAddOrganizationMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: addOrganizationMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            qc.invalidateQueries({ queryKey: ["organization-members"] });
            toast({ title: "Member added", duration: 2000 });
        },
        onError: onError("Could not add member"),
    });
};

export const useRemoveOrganizationMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: removeOrganizationMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            qc.invalidateQueries({ queryKey: ["organization-members"] });
            toast({ title: "Member removed", duration: 2000 });
        },
        onError: onError("Could not remove member"),
    });
};
