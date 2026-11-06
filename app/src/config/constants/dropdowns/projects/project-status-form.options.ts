export const ProjectStatusFormOptions: { id: string; label: string }[] = [
    { id: "NOT_STARTED", label: "Not started" },
    { id: "IN_PROGRESS", label: "In progress" },
    { id: "REVIEWING", label: "Reviewing" },
    { id: "EXAM_READY", label: "Exam ready" },
    { id: "COMPLETED", label: "Completed" },
];

export const getProjectStatusLabel = (status: string): string => ProjectStatusFormOptions.find((o) => o.id === status)?.label ?? status;
