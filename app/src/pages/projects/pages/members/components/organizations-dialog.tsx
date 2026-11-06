import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { displayName } from "@/lib/display-name";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/collaboration/org-role-form.options";
import { useAddOrganizationMember, useCreateOrganization, useOrganizationMembers, useOrganizations, useRemoveOrganizationMember } from "@/features/organizations/hooks/use-organizations";
import { cn } from "@/lib/utils";
import { organizationSchema, orgMemberSchema, type OrganizationFormValues, type OrgMemberFormValues } from "../validation-schemas/members.schema";
import { useTranslation } from "react-i18next";

interface OrganizationsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Lightweight manager for groups/organizations used as share targets. */
export const OrganizationsDialog = ({ open, onOpenChange }: OrganizationsDialogProps) => {
    const { t } = useTranslation("members");
    const orgs = useOrganizations();
    const [selected, setSelected] = useState<string | null>(null);
    const members = useOrganizationMembers(selected);
    const createOrg = useCreateOrganization();
    const addMember = useAddOrganizationMember();
    const removeMember = useRemoveOrganizationMember();
    const orgForm = useForm<OrganizationFormValues>({ resolver: zodResolver(organizationSchema), defaultValues: { name: "" } });
    const memberForm = useForm<OrgMemberFormValues>({ resolver: zodResolver(orgMemberSchema), defaultValues: { email: "" } });
    const current = orgs.data?.find((o) => o.id === selected) ?? null;
    const canManage = current && current.my_role !== "MEMBER";

    useEffect(() => {
        if (!selected && orgs.data?.length) setSelected(orgs.data[0].id);
    }, [orgs.data, selected]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{t("orgs.title")}</DialogTitle>
                    <DialogDescription>{t("orgs.description")}</DialogDescription>
                </DialogHeader>
                <Form {...orgForm}>
                    <form
                        onSubmit={orgForm.handleSubmit((v) => createOrg.mutate(v.name, { onSuccess: (o) => (orgForm.reset({ name: "" }), setSelected(o.id)) }))}
                        className="flex gap-2"
                        noValidate
                    >
                        <FormField
                            control={orgForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder={t("orgs.namePlaceholder")} aria-label={t("orgs.nameAria")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" loading={createOrg.isPending}>
                            {t("common:actions.create")}
                        </Button>
                    </form>
                </Form>
                <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                    <nav aria-label={t("orgs.yourOrganizations")} className="space-y-1">
                        {orgs.isPending ? (
                            <ListSkeleton rows={2} />
                        ) : !orgs.data?.length ? (
                            <p className="text-sm text-muted-foreground">{t("orgs.none")}</p>
                        ) : (
                            orgs.data.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => setSelected(o.id)}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        selected === o.id && "bg-surface-card font-medium",
                                    )}
                                    aria-current={selected === o.id}
                                >
                                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="flex-1 truncate">{o.name}</span>
                                    <span className="text-xs text-muted-foreground">{o.member_count}</span>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                                </button>
                            ))
                        )}
                    </nav>
                    {current ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">{current.name}</h3>
                                <Badge variant="secondary">{getOrgRoleLabel(current.my_role)}</Badge>
                            </div>
                            {canManage ? (
                                <Form {...memberForm}>
                                    <form
                                        onSubmit={memberForm.handleSubmit((v) => addMember.mutate({ id: current.id, dto: { email: v.email } }, { onSuccess: () => memberForm.reset({ email: "" }) }))}
                                        className="flex gap-2"
                                        noValidate
                                    >
                                        <FormField
                                            control={memberForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input type="email" placeholder={t("orgs.memberEmailPlaceholder")} aria-label={t("orgs.memberEmailAria")} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" variant="outline" loading={addMember.isPending}>
                                            {t("common:actions.add")}
                                        </Button>
                                    </form>
                                </Form>
                            ) : null}
                            {members.isPending ? (
                                <ListSkeleton rows={3} />
                            ) : (
                                <ul className="divide-y divide-border rounded-lg border border-border">
                                    {(members.data ?? []).map((m) => (
                                        <li key={m.user.id} className="flex items-center gap-3 p-2.5">
                                            <UserAvatar name={displayName(m.user)} src={m.user.avatar_url} className="h-8 w-8" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{displayName(m.user)}</p>
                                                <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                                            </div>
                                            <Badge variant="outline">{getOrgRoleLabel(m.role)}</Badge>
                                            {canManage && m.role !== "OWNER" ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={t("orgs.removeAria", { name: displayName(m.user) })}
                                                    onClick={() => removeMember.mutate({ id: current.id, userId: m.user.id })}
                                                    disabled={removeMember.isPending}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};
