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
import { Routes } from "@/routes/routes";
import { getProjectDifficultyLabel } from "@/config/constants/dropdowns/projects/project-difficulty-form.options";
import { getProjectStatusLabel } from "@/config/constants/dropdowns/projects/project-status-form.options";
import { useArchiveProject, useDeleteProject, useDuplicateProject, useUpdateProject, useUploadProjectCover } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { ProjectFormDialog } from "../../components/project-form-dialog";
import { useProjectContext } from "../../hooks/use-project-context";
import { ExportCenter } from "./components/export-center";
import { DeleteProjectDialog } from "./components/delete-project-dialog";

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
    const { project: header, projectId, can } = useProjectContext();
    usePageMetadata({ title: `${header.title} · Settings` });
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
        if (!file.type.startsWith("image/")) return toast({ title: "Choose an image", description: "PNG, JPEG, WEBP or GIF.", variant: "error" });
        if (file.size > MAX_COVER_BYTES) return toast({ title: "Image too large", description: "Cover images must be under 5 MB.", variant: "error" });
        cover.mutate({ id: projectId, file });
    };

    return (
        <Main width="narrow">
            <PageHeader title="Project settings" description="Details, cover, exports and lifecycle of this project." />
            <div className="space-y-6">
                <Section title="Details" description="Title, exam date, target score and study goals.">
                    <dl className="grid gap-4 sm:grid-cols-3">
                        <Detail label="Subject" value={project.subject} />
                        <Detail label="Exam date" value={project.exam_date ? formatDate(project.exam_date) : null} />
                        <Detail label="Target score" value={`${project.target_score}%`} />
                        <Detail label="Difficulty" value={getProjectDifficultyLabel(project.difficulty)} />
                        <Detail label="Status" value={getProjectStatusLabel(project.status)} />
                        <Detail label="Daily goal" value={project.daily_minutes_goal ? `${project.daily_minutes_goal} min · ${project.weekly_days_target} days/week` : null} />
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
                            <Pencil className="mr-2 h-4 w-4" /> Edit details
                        </Button>
                    ) : null}
                </Section>

                {can.edit ? (
                    <Section title="Cover image" description="Shown on your project card. PNG, JPEG, WEBP or GIF up to 5 MB.">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="h-24 w-40 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/30 to-accent">
                                {header.cover_url ? <img src={header.cover_url} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => onCover(e.target.files?.[0])} aria-label="Upload cover image" />
                            <Button variant="outline" onClick={() => fileInput.current?.click()} loading={cover.isPending}>
                                <ImagePlus className="mr-2 h-4 w-4" /> {header.cover_url ? "Replace cover" : "Upload cover"}
                            </Button>
                        </div>
                    </Section>
                ) : null}

                <Section title="Export" description="Download your study material. Choose “Print / save as PDF” for a printable version.">
                    <ExportCenter projectId={projectId} />
                </Section>

                <Section title="Copy" description="Create your own copy with documents, topics, questions and flashcards (personal progress is not copied).">
                    <Button variant="outline" loading={duplicate.isPending} onClick={() => duplicate.mutate(projectId, { onSuccess: (p) => navigate(Routes.projects.detail(p.id)) })}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate project
                    </Button>
                </Section>

                {can.manageMembers || can.delete ? (
                    <Section title="Danger zone" tone="danger">
                        <div className="flex flex-wrap gap-3">
                            {can.manageMembers ? (
                                <Button variant="outline" onClick={() => (archived ? archive.mutate({ id: projectId, archived: false }) : setArchiveOpen(true))} loading={archive.isPending}>
                                    {archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                    {archived ? "Restore project" : "Archive project"}
                                </Button>
                            ) : null}
                            {can.delete ? (
                                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete project
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
                title="Archive this project?"
                description="It will be hidden from your active projects and daily sessions. You can restore it at any time."
                confirmText="Archive"
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
