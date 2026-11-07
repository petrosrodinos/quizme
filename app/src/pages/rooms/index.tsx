import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DoorOpen, Plus, Users } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GridSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatRelative } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useRooms } from "@/features/rooms/hooks/use-rooms";
import { CreateRoomDialog } from "./components/create-room-dialog";
import { useTranslation } from "react-i18next";

const ALL = "all";

export default function RoomsPage() {
    const { t } = useTranslation("rooms");
    usePageMetadata({ title: t("list.title") });
    const navigate = useNavigate();
    const [projectFilter, setProjectFilter] = useState<string>(ALL);
    const [createOpen, setCreateOpen] = useState(false);
    const projects = useProjects({ view: "active" });
    const rooms = useRooms(projectFilter === ALL ? undefined : projectFilter);

    return (
        <Main>
            <PageHeader
                title={t("list.title")}
                description={t("list.description")}
                actions={
                    <Button onClick={() => setCreateOpen(true)} disabled={!projects.data?.length}>
                        <Plus className="mr-2 h-4 w-4" /> {t("list.newRoom")}
                    </Button>
                }
            />
            <div className="mb-6 flex items-center gap-3">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-64" aria-label={t("list.filterByProject")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{t("list.allProjects")}</SelectItem>
                        {(projects.data ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {rooms.isPending ? (
                <GridSkeleton count={3} />
            ) : !rooms.data?.length ? (
                <EmptyState
                    icon={DoorOpen}
                    title={t("list.empty.title")}
                    description={t("list.empty.description")}
                    action={
                        projects.data?.length ? (
                            <Button onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> {t("list.createRoom")}
                            </Button>
                        ) : (
                            <Button variant="outline" asChild>
                                <Link to={Routes.projects.root}>{t("list.createProjectFirst")}</Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.data.map((r) => (
                        <li key={r.id}>
                            <Link
                                to={Routes.rooms.detail(r.id)}
                                className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="font-display text-xl">{r.name}</h2>
                                    {r.online ? (
                                        <Badge variant="success" className="shrink-0">
                                            <Users className="mr-1 h-3 w-3" /> {t("list.online", { count: r.online })}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="shrink-0">
                                            {t("list.quiet")}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{r.project?.title}</p>
                                <p className="mt-auto pt-4 text-xs text-muted-foreground">{t("list.active", { time: formatRelative(r.updated_at) })}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <CreateRoomDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                projects={projects.data ?? []}
                defaultProjectId={projectFilter === ALL ? undefined : projectFilter}
                onCreated={(room) => navigate(Routes.rooms.detail(room.id))}
            />
        </Main>
    );
}
