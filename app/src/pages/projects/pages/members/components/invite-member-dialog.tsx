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

interface InviteMemberDialogProps {
    projectId: string;
    myRole: MemberRole;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const InviteMemberDialog = ({ projectId, myRole, open, onOpenChange }: InviteMemberDialogProps) => {
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
                    <DialogTitle className="font-display text-2xl font-normal">Invite to project</DialogTitle>
                    <DialogDescription>They'll get an email with a link to join. Invitations expire after 14 days.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" autoComplete="email" placeholder="classmate@example.com" autoFocus {...field} />
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
                                    <FormLabel>Role</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label="Role">
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
                                Cancel
                            </Button>
                            <Button type="submit" loading={invite.isPending}>
                                Send invitation
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
