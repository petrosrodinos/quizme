import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const inviteMemberSchema = z.object({
    email: z.string().trim().toLowerCase().email({ error: () => tr("common:validation.email") }),
    role: z.enum(["ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER"]),
});
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const shareSchema = z
    .object({
        resource_type: z.enum(["PROJECT", "DOCUMENT", "DECK", "QUIZ", "NOTE", "STUDY_PLAN"]),
        resource_id: z.string().optional(),
        target_type: z.enum(["USER", "LINK", "ORGANIZATION"]),
        email: z.string().trim().optional(),
        organization_id: z.string().optional(),
        permission: z.enum(["VIEW", "EDIT"]),
        can_copy: z.boolean(),
        can_reshare: z.boolean(),
        expires_in_days: z.string().optional(),
    })
    .superRefine((v, ctx) => {
        if (["DOCUMENT", "DECK", "QUIZ", "NOTE"].includes(v.resource_type) && !v.resource_id)
            ctx.addIssue({ code: "custom", path: ["resource_id"], message: tr("members:share.validation.chooseItem") });
        if (v.target_type === "USER" && !z.string().email().safeParse(v.email ?? "").success)
            ctx.addIssue({ code: "custom", path: ["email"], message: tr("common:validation.email") });
        if (v.target_type === "ORGANIZATION" && !v.organization_id) ctx.addIssue({ code: "custom", path: ["organization_id"], message: tr("members:share.validation.chooseOrganization") });
        if (v.expires_in_days && !/^\d+$/.test(v.expires_in_days)) ctx.addIssue({ code: "custom", path: ["expires_in_days"], message: tr("members:share.validation.wholeDays") });
    });
export type ShareFormValues = z.infer<typeof shareSchema>;

export const organizationSchema = z.object({ name: z.string().trim().min(2, { error: () => tr("common:validation.minLength", { count: 2 }) }).max(120, { error: () => tr("common:validation.maxLength", { count: 120 }) }) });
export type OrganizationFormValues = z.infer<typeof organizationSchema>;

export const orgMemberSchema = z.object({ email: z.string().trim().toLowerCase().email({ error: () => tr("common:validation.email") }) });
export type OrgMemberFormValues = z.infer<typeof orgMemberSchema>;
