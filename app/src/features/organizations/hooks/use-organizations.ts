import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { addOrganizationMember, createOrganization, getOrganizationMembers, getOrganizations, removeOrganizationMember } from "../services/organizations.services";
import { tr } from "@/lib/i18n-options";

const onError = (titleKey: string) => (error: Error) => toast({ title: tr(titleKey), description: error.message, variant: "error" });

export const useOrganizations = () => useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });

export const useOrganizationMembers = (id: string | null) =>
    useQuery({ queryKey: ["organization-members", id], queryFn: () => getOrganizationMembers(id!), enabled: !!id });

export const useCreateOrganization = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createOrganization,
        onSuccess: (o) => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            toast({ title: tr("members:orgs.toasts.created"), description: o.name, duration: 2000 });
        },
        onError: onError("members:orgs.toasts.createFailed"),
    });
};

export const useAddOrganizationMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: addOrganizationMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            qc.invalidateQueries({ queryKey: ["organization-members"] });
            toast({ title: tr("members:orgs.toasts.memberAdded"), duration: 2000 });
        },
        onError: onError("members:orgs.toasts.addFailed"),
    });
};

export const useRemoveOrganizationMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: removeOrganizationMember,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["organizations"] });
            qc.invalidateQueries({ queryKey: ["organization-members"] });
            toast({ title: tr("members:orgs.toasts.memberRemoved"), duration: 2000 });
        },
        onError: onError("members:orgs.toasts.removeFailed"),
    });
};
