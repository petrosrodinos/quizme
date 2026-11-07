import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, Copy, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { formatPercent } from "@/lib/format";
import { Routes } from "@/routes/routes";
import { getProjectDifficultyLabel } from "@/config/constants/dropdowns/projects/project-difficulty-form.options";
import { getProjectStatusLabel } from "@/config/constants/dropdowns/projects/project-status-form.options";
import { useArchiveProject, useDeleteProject, useDuplicateProject, useUpdateProject, useUploadProjectCover } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { ProjectFormDialog } from "../../components/project-form-dialog";
import { useProjectContext } from "../../hooks/use-project-context";
import { ExportCenter } from "./components/export-center";
import { DeleteProjectDialog } from "./components/delete-project-dialog";
import { useTranslation } from "react-i18next";

const Section = ({ title, description, children, tone }: { title: string; description?: string; children: ReactNode; tone?: "danger" }) => (
    <section className={tone === "danger" ? "rounded-xl border border-destructive/40 p-5" : "rounded-xl border border-border bg-card p-5"}>
        <h2 className="font-display text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-4">{children}</div>
    </section>
);

const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
    <div>
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
);

const MAX_COVER_BYTES = 5 * 1024 * 1024;

export default function ProjectSettingsPage() {
    const { t } = useTranslation("projectSettings");
    const { project: header, projectId, can } = useProjectContext();
    usePageMetadata({ title: t("page.metaTitle", { project: header.title }) });
    const project = header as unknown as Project;
    const navigate = useNavigate();
    const fileInput = useRef<HTMLInputElement>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const update = useUpdateProject();
    const cover = useUploadProjectCover();
    const archive = useArchiveProject();
    const duplicate = useDuplicateProject();
    const remove = useDeleteProject();
    const archived = !!header.archived_at;

    const onCover = (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast({ title: t("cover.toasts.notImage.title"), description: t("cover.toasts.notImage.description"), variant: "error" });
        if (file.size > MAX_COVER_BYTES) return toast({ title: t("cover.toasts.tooLarge.title"), description: t("cover.toasts.tooLarge.description", { size: 5 }), variant: "error" });
        cover.mutate({ id: projectId, file });
    };

    return (
        <Main width="narrow">
            <PageHeader title={t("page.title")} description={t("page.description")} />
            <div className="space-y-6">
                <Section title={t("details.title")} description={t("details.description")}>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Detail label={t("details.subject")} value={project.subject} />
                        <Detail label={t("details.examDate")} value={project.exam_date ? formatDate(project.exam_date) : null} />
                        <Detail label={t("details.targetScore")} value={formatPercent(project.target_score)} />
                        <Detail label={t("details.difficulty")} value={getProjectDifficultyLabel(project.difficulty)} />
                        <Detail label={t("details.status")} value={getProjectStatusLabel(project.status)} />
                        <Detail label={t("details.dailyGoal")} value={project.daily_minutes_goal ? t("details.dailyGoalValue", { minutes: project.daily_minutes_goal, days: project.weekly_days_target }) : null} />
                    </dl>
                    {project.tags?.length ? (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {project.tags.map((t) => (
                                <Badge key={t} variant="secondary">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    ) : null}
                    {can.edit ? (
                        <Button className="mt-5" variant="outline" onClick={() => setEditOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t("details.edit")}
                        </Button>
                    ) : null}
                </Section>

                {can.edit ? (
                    <Section title={t("cover.title")} description={t("cover.description", { size: 5 })}>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="h-24 w-40 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/30 to-accent">
                                {header.cover_url ? <img src={header.cover_url} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => onCover(e.target.files?.[0])} aria-label={t("cover.uploadAria")} />
                            <Button variant="outline" onClick={() => fileInput.current?.click()} loading={cover.isPending}>
                                <ImagePlus className="mr-2 h-4 w-4" /> {header.cover_url ? t("cover.replace") : t("cover.upload")}
                            </Button>
                        </div>
                    </Section>
                ) : null}

                <Section title={t("export.title")} description={t("export.description")}>
                    <ExportCenter projectId={projectId} />
                </Section>

                <Section title={t("copy.title")} description={t("copy.description")}>
                    <Button variant="outline" loading={duplicate.isPending} onClick={() => duplicate.mutate(projectId, { onSuccess: (p) => navigate(Routes.projects.detail(p.id)) })}>
                        <Copy className="mr-2 h-4 w-4" /> {t("copy.duplicate")}
                    </Button>
                </Section>

                {can.manageMembers || can.delete ? (
                    <Section title={t("danger.title")} tone="danger">
                        <div className="flex flex-wrap gap-3">
                            {can.manageMembers ? (
                                <Button variant="outline" onClick={() => (archived ? archive.mutate({ id: projectId, archived: false }) : setArchiveOpen(true))} loading={archive.isPending}>
                                    {archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                    {archived ? t("danger.restore") : t("danger.archive")}
                                </Button>
                            ) : null}
                            {can.delete ? (
                                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> {t("danger.delete")}
                                </Button>
                            ) : null}
                        </div>
                    </Section>
                ) : null}
            </div>

            <ProjectFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                project={project}
                isPending={update.isPending}
                onSubmit={(dto) => update.mutate({ id: projectId, dto }, { onSuccess: () => setEditOpen(false) })}
            />
            <ConfirmationDialog
                isOpen={archiveOpen}
                onClose={() => setArchiveOpen(false)}
                onConfirm={() => archive.mutate({ id: projectId, archived: true }, { onSuccess: () => setArchiveOpen(false) })}
                isLoading={archive.isPending}
                title={t("danger.archiveConfirm.title")}
                description={t("danger.archiveConfirm.description")}
                confirmText={t("danger.archiveConfirm.confirm")}
            />
            <DeleteProjectDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                projectTitle={header.title}
                isPending={remove.isPending}
                onConfirm={() => remove.mutate(projectId, { onSuccess: () => navigate(Routes.projects.root, { replace: true }) })}
            />
        </Main>
    );
}
