import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const GridSkeleton = ({ count = 6, className }: { count?: number; className?: string }) => (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

export const ListSkeleton = ({ rows = 6, className }: { rows?: number; className?: string }) => (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
            </div>
        ))}
    </div>
);

export const DetailSkeleton = ({ className }: { className?: string }) => (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Loading">
        <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
    </div>
);

export const PageSkeleton = () => (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <DetailSkeleton />
    </div>
);
