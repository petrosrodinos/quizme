import type { OrgRole } from "@/features/organizations/interfaces/organizations.interfaces";
import { tOption } from "@/lib/i18n-options";

export const OrgRoleFormOptions: { id: OrgRole; label: string }[] = (["OWNER", "ADMIN", "MEMBER"] as OrgRole[]).map((id) => tOption(id, `members:orgRoles.${id}`));

export const getOrgRoleLabel = (id: string): string => OrgRoleFormOptions.find((o) => o.id === id)?.label ?? id;
