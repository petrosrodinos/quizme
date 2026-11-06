import { useEffect, useMemo } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useLearnStore } from "@/stores/learn";
import { RoutePatterns } from "@/routes/routes";

/**
 * The playful UI's "current course": the project the user last opened (or picked on the Learn path),
 * falling back to their first active project.
 */
export const useCurrentCourse = () => {
    const { data: projects, isPending } = useProjects({ view: "active" });
    const courseId = useLearnStore((s) => s.courseId);
    const setCourseId = useLearnStore((s) => s.setCourseId);
    const { pathname } = useLocation();
    const openedId = matchPath({ path: RoutePatterns.projects.detail, end: false }, pathname)?.params.projectId;

    // Opening a project makes it the current course.
    useEffect(() => {
        if (openedId && openedId !== courseId && projects?.some((p) => p.id === openedId)) setCourseId(openedId);
    }, [openedId, courseId, projects, setCourseId]);

    const course = useMemo(() => projects?.find((p) => p.id === courseId) ?? projects?.[0] ?? null, [projects, courseId]);
    return { course, courses: projects ?? [], isPending, setCourseId };
};
