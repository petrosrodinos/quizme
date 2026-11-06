import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAuthStore } from "@/stores/auth";
import { browserTimezone } from "@/lib/date";
import { TimezoneOptions } from "@/config/constants/dropdowns/timezone.options";
import { useChangePassword, useResendVerification } from "@/features/auth/hooks/use-auth";
import { useDeleteAccount, useUpdateProfile } from "@/features/account/hooks/use-account";
import { SettingsSection } from "../../components/settings-section";
import { changePasswordSchema, profileSchema, type ChangePasswordFormValues, type ProfileFormValues } from "../../validation-schemas/settings.schema";

export default function SettingsProfilePage() {
    usePageMetadata({ title: "Profile" });
    const user = useAuthStore((s) => s.user);
    const updateProfile = useUpdateProfile();
    const resend = useResendVerification();
    const changePassword = useChangePassword();
    const deleteAccount = useDeleteAccount();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const timezones = TimezoneOptions.some((t) => t.value === user?.timezone)
        ? TimezoneOptions
        : [{ value: user?.timezone || browserTimezone(), label: user?.timezone || browserTimezone() }, ...TimezoneOptions];

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { full_name: user?.full_name ?? "", timezone: user?.timezone ?? browserTimezone() },
    });
    useEffect(() => {
        if (user) profileForm.reset({ full_name: user.full_name ?? "", timezone: user.timezone });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const passwordForm = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { current_password: "", new_password: "", confirm_password: "" },
    });

    return (
        <div className="space-y-6">
            <SettingsSection title="Profile" description="How you appear to collaborators.">
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((v) => updateProfile.mutate(v))} className="space-y-4">
                        <FormField
                            control={profileForm.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full name</FormLabel>
                                    <FormControl>
                                        <Input autoComplete="name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={profileForm.control}
                            name="timezone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Timezone</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select timezone" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-72">
                                            {timezones.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Streaks and daily goals reset at midnight in this timezone.</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" loading={updateProfile.isPending}>
                            Save profile
                        </Button>
                    </form>
                </Form>
            </SettingsSection>

            <SettingsSection title="Email">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{user?.email}</span>
                    {user?.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs text-success">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
                        </span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning">
                                <MailWarning className="h-3.5 w-3.5" aria-hidden /> Not verified
                            </span>
                            <Button size="sm" variant="outline" onClick={() => resend.mutate()} loading={resend.isPending}>
                                Resend verification email
                            </Button>
                        </>
                    )}
                </div>
            </SettingsSection>

            <SettingsSection title="Change password" description="Changing your password signs you out of all other devices.">
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(({ current_password, new_password }) => changePassword.mutate({ current_password, new_password }, { onSuccess: () => passwordForm.reset() }))} className="space-y-4">
                        {(["current_password", "new_password", "confirm_password"] as const).map((name) => (
                            <FormField
                                key={name}
                                control={passwordForm.control}
                                name={name}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{name === "current_password" ? "Current password" : name === "new_password" ? "New password" : "Confirm new password"}</FormLabel>
                                        <FormControl>
                                            <PasswordInput autoComplete={name === "current_password" ? "current-password" : "new-password"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                        <Button type="submit" loading={changePassword.isPending}>
                            Update password
                        </Button>
                    </form>
                </Form>
            </SettingsSection>

            <SettingsSection title="Danger zone" tone="danger" description="Deleting your account permanently removes your projects, documents, progress and notes. This cannot be undone.">
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                    Delete account
                </Button>
            </SettingsSection>

            <Dialog
                open={deleteOpen}
                onOpenChange={(o) => {
                    if (!deleteAccount.isPending) {
                        setDeleteOpen(o);
                        setConfirmText("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>All projects you own and everything in them will be deleted. Type DELETE to confirm.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-delete">Confirmation</Label>
                        <Input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoComplete="off" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteAccount.isPending}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={confirmText !== "DELETE"} loading={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
                            Delete permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
