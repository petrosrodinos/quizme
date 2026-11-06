import { useRef } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, CalendarDays, Copy, ImagePlus, Layers, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate } from "@/lib/date";
import { getMemberRoleLabel, MemberRoleRank } from "@/config/constants/dropdowns/projects/member-role-form.options";
import { getProjectStatusLabel } from "@/config/constants/dropdowns/projects/project-status-form.options";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useTranslation } from "react-i18next";

interface ProjectCardProps {
    project: Project;
    onEdit: () => void;
    onDuplicate: () => void;
    onToggleArchive: () => void;
    onDelete: () => void;
    onCover: (file: File) => void;
}

/** Deterministic warm gradient for projects without a cover image. */
const fallbackGradient = (id: string) => {
    const palettes = [
        "from-[#efe9de] to-[#e8a55a]/40",
        "from-[#efe9de] to-[#5db8a6]/40",
        "from-[#efe9de] to-[#cc785c]/40",
        "from-[#e8e0d2] to-[#d4a017]/30",
    ];
    const sum = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
    return palettes[sum % palettes.length];
};

export const ProjectCard = ({ project, onEdit, onDuplicate, onToggleArchive, onDelete, onCover }: ProjectCardProps) => {
    const { t } = useTranslation("projects");
    const fileRef = useRef<HTMLInputElement>(null);
    const rank = MemberRoleRank[project.my_role] ?? 1;
    const days = daysUntil(project.exam_date);
    const archived = !!project.archived_at;

    return (
        <article className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md", archived && "opacity-75")}>
            <Link to={Routes.projects.detail(project.id)} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("card.open", { title: project.title })}>
                <div className={cn("relative h-28 w-full bg-gradient-to-br", !project.cover_url && fallbackGradient(project.id))}>
                    {project.cover_url && <img src={project.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    {project.subject && (
                        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">{project.subject}</span>
                    )}
                </div>
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Link to={Routes.projects.detail(project.id)} className="min-w-0">
                        <h3 className="line-clamp-2 font-display text-xl leading-snug hover:text-primary">{project.title}</h3>
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0" aria-label={t("card.actions")}>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {rank >= 3 && (
                                <DropdownMenuItem onClick={onEdit}>
                                    <Pencil className="mr-2 h-4 w-4" /> {t("card.edit")}
                                </DropdownMenuItem>
                            )}
                            {rank >= 3 && (
                                <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                                    <ImagePlus className="mr-2 h-4 w-4" /> {t("card.changeCover")}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={onDuplicate}>
                                <Copy className="mr-2 h-4 w-4" /> {t("card.duplicate")}
                            </DropdownMenuItem>
                            {rank >= 4 && (
                                <DropdownMenuItem onClick={onToggleArchive}>
                                    {archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                    {archived ? t("card.restore") : t("card.archive")}
                                </DropdownMenuItem>
                            )}
                            {rank >= 5 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> {t("card.delete")}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onCover(f);
                            e.target.value = "";
                        }}
                    />
                </div>
                {project.description && <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="secondary" className="font-normal">
                        {getProjectStatusLabel(project.status)}
                    </Badge>
                    {project.my_role !== "OWNER" && (
                        <Badge variant="outline" className="font-normal">
                            {getMemberRoleLabel(project.my_role)}
                        </Badge>
                    )}
                    {archived && (
                        <Badge variant="outline" className="font-normal">
                            {t("card.archived")}
                        </Badge>
                    )}
                </div>
                <div className="mt-auto space-y-3 pt-1">
                    <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{t("card.progress")}</span>
                            <span className="tabular-nums">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} aria-label={t("card.progressLabel", { title: project.title })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {project.exam_date && (
                            <span className={cn("inline-flex items-center gap-1", days !== null && days >= 0 && days <= 7 && "font-medium text-primary")}>
                                <CalendarDays className="h-3.5 w-3.5" />
                                {days !== null && days >= 0 ? t("common:time.daysToExam", { count: days }) : t("card.examOn", { date: formatDate(project.exam_date) })}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {t("card.cardsDue", { count: project.cards_due ?? 0 })}
                        </span>
                        {project.counts && <span>{t("card.docs", { count: project.counts.documents })}</span>}
                    </div>
                </div>
            </div>
        </article>
    );
};
