export const MemberRoleFormOptions: { id: string; label: string; description: string }[] = [
    { id: "OWNER", label: "Owner", description: "Full control, including deleting the project" },
    { id: "ADMIN", label: "Admin", description: "Manage members, sharing and all content" },
    { id: "EDITOR", label: "Editor", description: "Edit all study material" },
    { id: "CONTRIBUTOR", label: "Contributor", description: "Add documents, notes and questions" },
    { id: "VIEWER", label: "Viewer", description: "Study and view only" },
];

export const getMemberRoleLabel = (role: string): string => MemberRoleFormOptions.find((o) => o.id === role)?.label ?? role;

/** Role rank used for client-side affordances only (server enforces permissions). */
export const MemberRoleRank: Record<string, number> = { OWNER: 5, ADMIN: 4, EDITOR: 3, CONTRIBUTOR: 2, VIEWER: 1 };
