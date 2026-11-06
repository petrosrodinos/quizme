import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Progress } from "@/components/ui/progress";
import type { ProjectOverview } from "@/features/projects/interfaces/projects.interfaces";
import { useTranslation } from "react-i18next";

interface ReadinessCardProps {
    readiness: ProjectOverview["readiness"];
    targetScore: number;
}

export const ReadinessCard = ({ readiness, targetScore }: ReadinessCardProps) => {
    const { t } = useTranslation("overview");
    const score = Math.round(readiness?.score ?? 0);
    return (
        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="readiness-heading">
            <h2 id="readiness-heading" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("readiness.title")}
            </h2>
            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <ProgressRing value={score} size={128} strokeWidth={10} label={t("readiness.title")} indicatorClassName={score >= targetScore ? "text-success" : "text-primary"}>
                    <div className="text-center">
                        <div className="font-display text-3xl tabular-nums">
                            <AnimatedCounter value={score} suffix="%" />
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t("readiness.target", { value: targetScore })}</div>
                    </div>
                </ProgressRing>
                <div className="w-full min-w-0 flex-1 space-y-2.5">
                    {readiness?.factors?.length ? (
                        readiness.factors.map((f) => {
                            const label = t(`readiness.factors.${f.key}`, { defaultValue: f.label });
                            return (
                            <div key={f.key}>
                                <div className="mb-1 flex justify-between text-xs">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className={cn("tabular-nums", f.value == null && "text-muted-foreground")}>{f.value == null ? "—" : `${Math.round(f.value)}%`}</span>
                                </div>
                                <Progress value={f.value ?? 0} aria-label={label} className={cn("h-1.5", f.value == null && "opacity-40")} />
                            </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("readiness.empty")}</p>
                    )}
                </div>
            </div>
            {!!readiness?.blockers?.length && (
                <div className="mt-5 rounded-lg bg-surface-card p-3">
                    <div className="mb-1.5 text-xs font-medium text-foreground">{t("readiness.blockers")}</div>
                    <ul className="space-y-1">
                        {readiness.blockers.map((b) => (
                            <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};
