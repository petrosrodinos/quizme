import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentCourse } from "@/hooks/use-current-course";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { CourseBadge } from "./course-badge";

/** Current-course picker (the "flag" button at the top-left of the playful shell). */
export const CourseSwitcher = ({ className, showTitle = false }: { className?: string; showTitle?: boolean }) => {
    const { t } = useTranslation("playful");
    const navigate = useNavigate();
    const { course, courses, isPending, setCourseId } = useCurrentCourse();

    if (isPending) return <Skeleton className={cn("h-10 w-12 rounded-xl", className)} />;
    if (!course) {
        return (
            <Link to={Routes.projects.root} className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-muted-foreground hover:bg-muted", className)}>
                <span className="grid size-8 place-items-center rounded-lg border-2 border-dashed border-border">
                    <Plus className="size-4" />
                </span>
                {showTitle && t("course.noCourse")}
            </Link>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn("inline-flex h-10 min-w-0 items-center gap-2 rounded-xl px-1.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
                aria-label={`${t("course.switch")}: ${course.title}`}
            >
                <CourseBadge id={course.id} title={course.title} />
                {showTitle && <span className="min-w-0 truncate text-[15px] font-extrabold">{course.title}</span>}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 rounded-2xl border-2 p-2">
                <DropdownMenuLabel className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{t("course.pick")}</DropdownMenuLabel>
                {courses.map((c) => (
                    <DropdownMenuItem
                        key={c.id}
                        className="gap-3 rounded-xl py-2 font-bold"
                        onSelect={() => {
                            setCourseId(c.id);
                            navigate(Routes.dashboard);
                        }}
                    >
                        <CourseBadge id={c.id} title={c.title} />
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        {c.id === course.id && <Check className="size-4 text-[var(--pf-green)]" />}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-3 rounded-xl py-2 font-bold">
                    <Link to={Routes.projects.root}>
                        <span className="grid size-8 place-items-center rounded-lg border-2 border-border">
                            <Plus className="size-4" />
                        </span>
                        {t("course.addNew")}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
