import { tOption } from "@/lib/i18n-options";

export const ProjectStatusFormOptions = [
    tOption("NOT_STARTED", "projects:status.NOT_STARTED"),
    tOption("IN_PROGRESS", "projects:status.IN_PROGRESS"),
    tOption("REVIEWING", "projects:status.REVIEWING"),
    tOption("EXAM_READY", "projects:status.EXAM_READY"),
    tOption("COMPLETED", "projects:status.COMPLETED"),
];

export const getProjectStatusLabel = (status: string): string => ProjectStatusFormOptions.find((o) => o.id === status)?.label ?? status;
