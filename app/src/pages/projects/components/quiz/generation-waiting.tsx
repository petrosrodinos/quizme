import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { translateServerMessage } from "@/lib/api-error";
import { getGenerationStatusLabel } from "@/config/constants/dropdowns/quizzes/generation-status.options";
import type { Quiz } from "@/features/quizzes/interfaces/quizzes.interfaces";

const TIPS = ["grounded", "references", "mistakes", "explain"] as const;

interface GenerationWaitingProps {
    quiz: Quiz;
    onBack: () => void;
}

/** Shown while a quiz is queued/generating; quiz status updates arrive via polling + realtime. */
export const GenerationWaiting = ({ quiz, onBack }: GenerationWaitingProps) => {
    const { t } = useTranslation("quiz");
    const [tip, setTip] = useState(0);
    const [progress, setProgress] = useState(8);
    useEffect(() => {
        const t = setInterval(() => {
            setTip((i) => (i + 1) % TIPS.length);
            setProgress((p) => Math.min(92, p + (100 - p) * 0.12));
        }, 2500);
        return () => clearInterval(t);
    }, []);

    if (quiz.status === "FAILED") {
        return (
            <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
                <h2 className="font-display text-2xl">{t("generation.failedTitle")}</h2>
                <p className="text-sm text-muted-foreground">{quiz.error_message ? translateServerMessage(quiz.error_message) : t("generation.failedDescription")}</p>
                <Button onClick={onBack}>{t("generation.backToQuizzes")}</Button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg space-y-5 rounded-2xl border border-border bg-card p-8 text-center" aria-busy="true">
            <Sparkles className="mx-auto h-10 w-10 animate-pulse text-primary" aria-hidden />
            <h2 className="font-display text-2xl">{quiz.title}</h2>
            <p className="text-sm text-muted-foreground">{getGenerationStatusLabel(quiz.status)}</p>
            <Progress value={progress} className="h-2" />
            <p className="min-h-10 text-sm text-muted-foreground" aria-live="polite">
                {t(`generation.tips.${TIPS[tip]}`)}
            </p>
            <Button variant="ghost" onClick={onBack}>
                {t("generation.startLater")}
            </Button>
        </div>
    );
};
