import { courseColor } from "@/lib/course-color";
import { cn } from "@/lib/utils";

/** Rounded "flag" for a course: first letter on a stable bright colour with a ridge. */
export const CourseBadge = ({ id, title, className }: { id: string; title: string; className?: string }) => {
    const { fill, ridge } = courseColor(id);
    return (
        <span
            aria-hidden
            className={cn("inline-grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black uppercase text-white", className)}
            style={{ background: fill, boxShadow: `0 3px 0 0 ${ridge}` }}
        >
            {title.trim().charAt(0) || "?"}
        </span>
    );
};
