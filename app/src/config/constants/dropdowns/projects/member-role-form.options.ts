import { tOption } from "@/lib/i18n-options";

type RoleOption = { id: string; label: string; description: string };

export const MemberRoleFormOptions: RoleOption[] = ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER"].map(
    (id) => tOption(id, `members:roles.${id}.label`, `members:roles.${id}.description`) as RoleOption,
);

export const getMemberRoleLabel = (role: string): string => MemberRoleFormOptions.find((o) => o.id === role)?.label ?? role;

/** Role rank used for client-side affordances only (server enforces permissions). */
export const MemberRoleRank: Record<string, number> = { OWNER: 5, ADMIN: 4, EDITOR: 3, CONTRIBUTOR: 2, VIEWER: 1 };
