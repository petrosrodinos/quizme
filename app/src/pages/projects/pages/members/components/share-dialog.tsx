import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SharePermissionFormOptions, ShareResourceTypeFormOptions, ShareTargetTypeFormOptions } from "@/config/constants/dropdowns/collaboration/share-form.options";
import { useCreateShare, useShareableResources } from "@/features/shares/hooks/use-shares";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import type { ShareResourceType } from "@/features/shares/interfaces/shares.interfaces";
import { shareSchema, type ShareFormValues } from "../validation-schemas/members.schema";
import { useTranslation } from "react-i18next";

interface ShareDialogProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DEFAULTS: ShareFormValues = {
    resource_type: "PROJECT",
    resource_id: "",
    target_type: "LINK",
    email: "",
    organization_id: "",
    permission: "VIEW",
    can_copy: true,
    can_reshare: false,
    expires_in_days: "",
};

const NEEDS_PICKER: ShareResourceType[] = ["DOCUMENT", "DECK", "QUIZ", "NOTE"];

export const ShareDialog = ({ projectId, open, onOpenChange }: ShareDialogProps) => {
    const { t } = useTranslation("members");
    const create = useCreateShare();
    const form = useForm<ShareFormValues>({ resolver: zodResolver(shareSchema), defaultValues: DEFAULTS });
    const resourceType = useWatch({ control: form.control, name: "resource_type" });
    const targetType = useWatch({ control: form.control, name: "target_type" });
    const resources = useShareableResources(projectId, resourceType, open && NEEDS_PICKER.includes(resourceType));
    const orgs = useOrganizations();
    const [createdUrl, setCreatedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open) {
            form.reset(DEFAULTS);
            setCreatedUrl(null);
            setCopied(false);
        }
    }, [open, form]);

    useEffect(() => {
        form.setValue("resource_id", "");
    }, [resourceType, form]);

    const submit = (v: ShareFormValues) =>
        create.mutate(
            {
                projectId,
                dto: {
                    resource_type: v.resource_type,
                    resource_id: NEEDS_PICKER.includes(v.resource_type) ? v.resource_id : undefined,
                    target_type: v.target_type,
                    email: v.target_type === "USER" ? v.email?.trim().toLowerCase() : undefined,
                    organization_id: v.target_type === "ORGANIZATION" ? v.organization_id : undefined,
                    permission: v.permission,
                    can_copy: v.can_copy,
                    can_reshare: v.can_reshare,
                    expires_in_days: v.expires_in_days ? Number(v.expires_in_days) : undefined,
                },
            },
            {
                onSuccess: (res) => {
                    if (res.url) setCreatedUrl(res.url);
                    else onOpenChange(false);
                },
            },
        );

    const copyLink = async () => {
        if (!createdUrl) return;
        await navigator.clipboard.writeText(createdUrl);
        setCopied(true);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{t("share.dialog.title")}</DialogTitle>
                    <DialogDescription>{t("share.dialog.description")}</DialogDescription>
                </DialogHeader>
                {createdUrl ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t("share.dialog.linkReady")}</p>
                        <div className="flex gap-2">
                            <Input readOnly value={createdUrl} aria-label={t("share.dialog.linkAria")} onFocus={(e) => e.currentTarget.select()} />
                            <Button type="button" variant="outline" onClick={copyLink} aria-label={t("share.dialog.copyLink")}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>{t("common:actions.done")}</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="resource_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.what")}</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger aria-label={t("share.dialog.contentType")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ShareResourceTypeFormOptions.map((o) => (
                                                        <SelectItem key={o.id} value={o.id}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="target_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.with")}</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger aria-label={t("share.dialog.shareWith")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ShareTargetTypeFormOptions.map((o) => (
                                                        <SelectItem key={o.id} value={o.id}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {NEEDS_PICKER.includes(resourceType) ? (
                                <FormField
                                    control={form.control}
                                    name="resource_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.item")}</FormLabel>
                                            <Select value={field.value || undefined} onValueChange={field.onChange} disabled={resources.isPending}>
                                                <FormControl>
                                                    <SelectTrigger aria-label={t("share.dialog.itemAria")}>
                                                        <SelectValue placeholder={resources.isPending ? t("common:status.loading") : resources.data?.length ? t("share.dialog.choose") : t("share.dialog.nothingToShare")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(resources.data ?? []).map((r) => (
                                                        <SelectItem key={r.id} value={r.id}>
                                                            {r.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : null}
                            {targetType === "USER" ? (
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("invite.email")}</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder={t("share.dialog.emailPlaceholder")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : null}
                            {targetType === "ORGANIZATION" ? (
                                <FormField
                                    control={form.control}
                                    name="organization_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.organization")}</FormLabel>
                                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger aria-label={t("share.dialog.organization")}>
                                                        <SelectValue placeholder={orgs.data?.length ? t("share.dialog.choose") : t("share.dialog.createOrgFirst")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(orgs.data ?? []).map((o) => (
                                                        <SelectItem key={o.id} value={o.id}>
                                                            {o.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : null}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="permission"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.permission")}</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger aria-label={t("share.dialog.permission")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {SharePermissionFormOptions.map((o) => (
                                                        <SelectItem key={o.id} value={o.id}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="expires_in_days"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("share.dialog.expiresAfter")}</FormLabel>
                                            <FormControl>
                                                <Input inputMode="numeric" placeholder={t("share.dialog.never")} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex flex-wrap gap-6">
                                <FormField
                                    control={form.control}
                                    name="can_copy"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t("share.dialog.allowCopy")}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="can_reshare"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t("share.dialog.allowReshare")}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                                    {t("common:actions.cancel")}
                                </Button>
                                <Button type="submit" loading={create.isPending}>
                                    {t("share.dialog.submit")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};
