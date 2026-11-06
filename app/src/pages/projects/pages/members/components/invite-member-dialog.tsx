import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberRoleFormOptions, MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { useInviteMember } from "@/features/collaboration/hooks/use-collaboration";
import type { MemberRole } from "@/features/collaboration/interfaces/collaboration.interfaces";
import { inviteMemberSchema, type InviteMemberFormValues } from "../validation-schemas/members.schema";
import { useTranslation } from "react-i18next";

interface InviteMemberDialogProps {
    projectId: string;
    myRole: MemberRole;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const InviteMemberDialog = ({ projectId, myRole, open, onOpenChange }: InviteMemberDialogProps) => {
    const { t } = useTranslation("members");
    const invite = useInviteMember();
    const form = useForm<InviteMemberFormValues>({ resolver: zodResolver(inviteMemberSchema), defaultValues: { email: "", role: "VIEWER" } });
    const myRank = MemberRoleRank[myRole] ?? 1;
    // Owners can grant Admin; admins can grant up to Editor.
    const roleOptions = MemberRoleFormOptions.filter((o) => o.id !== "OWNER" && (myRole === "OWNER" ? true : MemberRoleRank[o.id] < myRank));

    useEffect(() => {
        if (open) form.reset({ email: "", role: "VIEWER" });
    }, [open, form]);

    const submit = (v: InviteMemberFormValues) => invite.mutate({ projectId, dto: v }, { onSuccess: () => onOpenChange(false) });

    return (
        <Dialog open={open} onOpenChange={(o) => !invite.isPending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{t("invite.title")}</DialogTitle>
                    <DialogDescription>{t("invite.description", { count: 14 })}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("invite.email")}</FormLabel>
                                    <FormControl>
                                        <Input type="email" autoComplete="email" placeholder={t("invite.emailPlaceholder")} autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("invite.role")}</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label={t("invite.role")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roleOptions.map((o) => (
                                                <SelectItem key={o.id} value={o.id}>
                                                    {o.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{MemberRoleFormOptions.find((o) => o.id === field.value)?.description}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
                                {t("common:actions.cancel")}
                            </Button>
                            <Button type="submit" loading={invite.isPending}>
                                {t("invite.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
