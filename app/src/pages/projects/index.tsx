import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Plus, Search } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GridSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import {
    useArchiveProject,
    useCreateProject,
    useDeleteProject,
    useDuplicateProject,
    useProjects,
    useUpdateProject,
    useUploadProjectCover,
} from "@/features/projects/hooks/use-projects";
import { ProjectViews, type CreateProjectDto, type Project, type ProjectView } from "@/features/projects/interfaces/projects.interfaces";
import { ProjectCard } from "./components/project-card";
import { ProjectFormDialog } from "./components/project-form-dialog";

export default function ProjectsPage() {
    usePageMetadata({ title: "Projects" });
    const navigate = useNavigate();
    const [view, setView] = useState<ProjectView>(ProjectViews.ACTIVE);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data: projects, isPending, isError, error, refetch } = useProjects({ view, search: search || undefined });
    const create = useCreateProject();
    const update = useUpdateProject();
    const remove = useDeleteProject();
    const archive = useArchiveProject();
    const duplicate = useDuplicateProject();
    const cover = useUploadProjectCover();

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const submit = (dto: CreateProjectDto) => {
        if (editing) update.mutate({ id: editing.id, dto }, { onSuccess: () => setFormOpen(false) });
        else
            create.mutate(dto, {
                onSuccess: (p) => {
                    setFormOpen(false);
                    navigate(Routes.projects.documents(p.id));
                },
            });
    };

    return (
        <Main width="wide">
            <PageHeader
                eyebrow="Your learning"
                title="Study projects"
                description="Each project is a subject, course or exam with its own material, quizzes, flashcards and progress."
                actions={
                    <Button onClick={openCreate}>
                        <Plus /> New project
                    </Button>
                }
            />

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search projects, subjects, tags" className="pl-9" aria-label="Search projects" />
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as ProjectView)}>
                    <TabsList>
                        <TabsTrigger value={ProjectViews.ACTIVE}>Active</TabsTrigger>
                        <TabsTrigger value={ProjectViews.ARCHIVED}>Archived</TabsTrigger>
                        <TabsTrigger value={ProjectViews.ALL}>All</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {isPending ? (
                <GridSkeleton count={6} />
            ) : isError ? (
                <EmptyState title="Couldn't load projects" description={error.message} action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>} />
            ) : !projects.length ? (
                search || view !== ProjectViews.ACTIVE ? (
                    <EmptyState icon={Search} title="No projects found" description="Try a different search or view." compact />
                ) : (
                    <EmptyState
                        icon={FolderPlus}
                        title="Create your first study project"
                        description="Add a subject or exam, upload your notes and textbooks, and QuizMe will turn them into quizzes, flashcards and a personal study plan."
                        action={
                            <Button onClick={openCreate}>
                                <Plus /> New project
                            </Button>
                        }
                    />
                )
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((p) => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onEdit={() => {
                                setEditing(p);
                                setFormOpen(true);
                            }}
                            onDuplicate={() => duplicate.mutate(p.id)}
                            onToggleArchive={() => archive.mutate({ id: p.id, archived: !p.archived_at })}
                            onDelete={() => setDeleting(p)}
                            onCover={(file) => cover.mutate({ id: p.id, file })}
                        />
                    ))}
                </div>
            )}

            <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} isPending={create.isPending || update.isPending} onSubmit={submit} />
            <ConfirmationDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
                title={`Delete "${deleting?.title ?? ""}"?`}
                description="This permanently deletes the project with all its documents, quizzes, flashcards, notes and progress for every member. This cannot be undone."
                confirmText="Delete project"
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
