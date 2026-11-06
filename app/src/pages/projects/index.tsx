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
import { useTranslation } from "react-i18next";

export default function ProjectsPage() {
    const { t } = useTranslation("projects");
    usePageMetadata({ title: t("page.metaTitle") });
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
                eyebrow={t("page.eyebrow")}
                title={t("page.title")}
                description={t("page.description")}
                actions={
                    <Button onClick={openCreate}>
                        <Plus /> {t("page.newProject")}
                    </Button>
                }
            />

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("page.searchPlaceholder")} className="pl-9" aria-label={t("page.searchLabel")} />
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as ProjectView)}>
                    <TabsList>
                        <TabsTrigger value={ProjectViews.ACTIVE}>{t("views.active")}</TabsTrigger>
                        <TabsTrigger value={ProjectViews.ARCHIVED}>{t("views.archived")}</TabsTrigger>
                        <TabsTrigger value={ProjectViews.ALL}>{t("views.all")}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {isPending ? (
                <GridSkeleton count={6} />
            ) : isError ? (
                <EmptyState title={t("page.loadError")} description={error.message} action={<Button variant="outline" onClick={() => refetch()}>{t("common:actions.tryAgain")}</Button>} />
            ) : !projects.length ? (
                search || view !== ProjectViews.ACTIVE ? (
                    <EmptyState icon={Search} title={t("page.noResults.title")} description={t("page.noResults.description")} compact />
                ) : (
                    <EmptyState
                        icon={FolderPlus}
                        title={t("page.empty.title")}
                        description={t("page.empty.description")}
                        action={
                            <Button onClick={openCreate}>
                                <Plus /> {t("page.newProject")}
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
                title={t("delete.title", { title: deleting?.title ?? "" })}
                description={t("delete.description")}
                confirmText={t("delete.confirm")}
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Main>
    );
}
