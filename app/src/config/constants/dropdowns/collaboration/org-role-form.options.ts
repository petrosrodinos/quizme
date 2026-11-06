import type { OrgRole } from "@/features/organizations/interfaces/organizations.interfaces";

export const OrgRoleFormOptions: { id: OrgRole; label: string }[] = [
    { id: "OWNER", label: "Owner" },
    { id: "ADMIN", label: "Admin" },
    { id: "MEMBER", label: "Member" },
];

export const getOrgRoleLabel = (id: string): string => OrgRoleFormOptions.find((o) => o.id === id)?.label ?? id;
