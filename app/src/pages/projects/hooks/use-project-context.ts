import { useOutletContext } from "react-router-dom";
import type { ProjectHeader } from "@/features/projects/interfaces/project-header.interfaces";
import { MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";

export interface ProjectContext {
    project: ProjectHeader;
    projectId: string;
    /** Client-side affordance checks only; the server enforces permissions. */
    can: {
        contribute: boolean;
        edit: boolean;
        manageMembers: boolean;
        delete: boolean;
    };
}

export const buildProjectContext = (project: ProjectHeader): ProjectContext => {
    const rank = MemberRoleRank[project.my_role] ?? 1;
    return {
        project,
        projectId: project.id,
        can: { contribute: rank >= 2, edit: rank >= 3, manageMembers: rank >= 4, delete: rank >= 5 },
    };
};

/** Access the current project inside any page rendered under ProjectLayout. */
export const useProjectContext = () => useOutletContext<ProjectContext>();
