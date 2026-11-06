import { Link } from "react-router-dom";
import { Clock, Target, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Mascot } from "@/components/ui/mascot";
import type { Attempt } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { formatDuration } from "@/lib/date";
import { Routes } from "@/routes/routes";

interface LessonCompleteProps {
    projectId: string;
    quizId: string;
    attempt: Attempt;
    passed: boolean;
}

/** Playful end-of-lesson screen: mascot, XP / accuracy / time tiles and big Continue. */
export const LessonComplete = ({ projectId, quizId, attempt, passed }: LessonCompleteProps) => {
    const { t } = useTranslation("playful");
    const perfect = attempt.percentage >= 100;
    const tiles = [
        { key: "xp", icon: Zap, color: "var(--pf-yellow)", ridge: "var(--pf-yellow-ridge)", value: <AnimatedCounter value={attempt.xp_earned ?? 0} /> },
        { key: "accuracy", icon: Target, color: "var(--pf-green)", ridge: "var(--pf-green-ridge)", value: <AnimatedCounter value={Math.round(attempt.percentage)} suffix="%" /> },
        { key: "time", icon: Clock, color: "var(--pf-blue)", ridge: "var(--pf-blue-ridge)", value: formatDuration(attempt.time_spent_sec) },
    ] as const;

    return (
        <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 pt-6 text-center">
            <Mascot pose={passed ? "celebrate" : "sad"} animated className="size-44 sm:size-52" />
            <h1 className="mt-4 text-3xl font-black text-[var(--pf-yellow-ridge)]">{passed ? t("complete.title") : t("complete.titleFail")}</h1>
            <p className="mt-2 font-bold text-muted-foreground">{perfect ? t("complete.subtitlePerfect") : passed ? t("complete.subtitle") : t("complete.subtitleFail")}</p>

            <div className="mt-8 grid w-full grid-cols-3 gap-3">
                {tiles.map(({ key, icon: Icon, color, ridge, value }) => (
                    <div key={key} className="overflow-hidden rounded-2xl border-2" style={{ borderColor: color, background: color }}>
                        <div className="py-1 text-[11px] font-black uppercase tracking-wide text-white">{t(`complete.${key}`)}</div>
                        <div className="flex items-center justify-center gap-1 rounded-xl bg-background px-1 py-3 text-lg font-black" style={{ color: ridge }}>
                            <Icon className="size-5 shrink-0" strokeWidth={3} />
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex w-full flex-col gap-3">
                <Button asChild size="lg" className="w-full">
                    <Link to={Routes.dashboard}>{t("complete.continue")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                    <Link to={Routes.projects.quiz_take(projectId, quizId)}>{t("complete.again")}</Link>
                </Button>
                <a href="#answers" className="py-2 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-blue)]">
                    {t("complete.review")}
                </a>
            </div>
        </section>
    );
};
