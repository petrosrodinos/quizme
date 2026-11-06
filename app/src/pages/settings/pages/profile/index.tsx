import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, MailWarning } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { Features } from "@/config/features";
import { useChangePassword, useResendVerification } from "@/features/auth/hooks/use-auth";
import { useDeleteAccount, useUpdateProfile } from "@/features/account/hooks/use-account";
import { SettingsSection } from "../../components/settings-section";
import { changePasswordSchema, profileSchema, type ChangePasswordFormValues, type ProfileFormValues } from "../../validation-schemas/settings.schema";

export default function SettingsProfilePage() {
    const { t } = useTranslation("settings");
    usePageMetadata({ title: t("profile.pageTitle") });
    const confirmWord = t("profile.delete.confirmWord");
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
            <SettingsSection title={t("profile.title")} description={t("profile.description")}>
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((v) => updateProfile.mutate(v))} className="space-y-4">
                        <FormField
                            control={profileForm.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("auth:fields.fullName")}</FormLabel>
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
                                    <FormLabel>{t("profile.timezone")}</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t("profile.timezonePlaceholder")} />
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
                                    <p className="text-xs text-muted-foreground">{t("profile.timezoneHint")}</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" loading={updateProfile.isPending}>
                            {t("profile.save")}
                        </Button>
                    </form>
                </Form>
            </SettingsSection>

            <SettingsSection title={t("profile.email.title")}>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{user?.email}</span>
                    {!Features.emailVerification ? null : user?.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs text-success">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("profile.email.verified")}
                        </span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning">
                                <MailWarning className="h-3.5 w-3.5" aria-hidden /> {t("profile.email.notVerified")}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => resend.mutate()} loading={resend.isPending}>
                                {t("profile.email.resend")}
                            </Button>
                        </>
                    )}
                </div>
            </SettingsSection>

            <SettingsSection title={t("profile.password.title")} description={t("profile.password.description")}>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(({ current_password, new_password }) => changePassword.mutate({ current_password, new_password }, { onSuccess: () => passwordForm.reset() }))} className="space-y-4">
                        {(["current_password", "new_password", "confirm_password"] as const).map((name) => (
                            <FormField
                                key={name}
                                control={passwordForm.control}
                                name={name}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{name === "current_password" ? t("profile.password.current") : name === "new_password" ? t("auth:fields.newPassword") : t("auth:fields.confirmNewPassword")}</FormLabel>
                                        <FormControl>
                                            <PasswordInput autoComplete={name === "current_password" ? "current-password" : "new-password"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                        <Button type="submit" loading={changePassword.isPending}>
                            {t("auth:reset.submit")}
                        </Button>
                    </form>
                </Form>
            </SettingsSection>

            <SettingsSection title={t("profile.danger.title")} tone="danger" description={t("profile.danger.description")}>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                    {t("profile.danger.action")}
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
                        <DialogTitle>{t("profile.delete.title")}</DialogTitle>
                        <DialogDescription>{t("profile.delete.description", { word: confirmWord })}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-delete">{t("profile.delete.confirmation")}</Label>
                        <Input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={confirmWord} autoComplete="off" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteAccount.isPending}>
                            {t("common:actions.cancel")}
                        </Button>
                        <Button variant="destructive" disabled={confirmText.trim().toLocaleUpperCase() !== confirmWord.toLocaleUpperCase()} loading={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
                            {t("profile.delete.submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
