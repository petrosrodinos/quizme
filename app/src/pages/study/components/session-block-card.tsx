import type { FC } from "react";
import { BookOpenCheck, Brain, FileUp, GraduationCap, Layers, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SessionBlockTypeOptions } from "@/config/constants/dropdowns/study/session-block-type.options";
import { getSessionBlockReason } from "@/config/constants/dropdowns/study/session-block-reason.options";
import { getSessionBlockAction } from "@/config/constants/dropdowns/study/session-block-type.options";
import { SessionBlockTypes, type SessionBlock, type SessionBlockType } from "@/features/study/interfaces/study.interfaces";

const icons: Record<SessionBlockType, typeof Layers> = {
    [SessionBlockTypes.FLASHCARDS]: Layers,
    [SessionBlockTypes.WEAK_TOPICS]: Target,
    [SessionBlockTypes.ADAPTIVE_QUIZ]: BookOpenCheck,
    [SessionBlockTypes.RECALL]: Brain,
    [SessionBlockTypes.EXAM]: GraduationCap,
    [SessionBlockTypes.UPLOAD]: FileUp,
};

interface SessionBlockCardProps {
    block: SessionBlock;
    index: number;
    onStart: (block: SessionBlock) => void;
    isStarting?: boolean;
}

export const SessionBlockCard: FC<SessionBlockCardProps> = ({ block, index, onStart, isStarting }) => {
    const { t } = useTranslation("study");
    const Icon = icons[block.type] ?? BookOpenCheck;
    return (
        <li className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-start gap-4 sm:flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("block.step", { number: index + 1 })}</span>
                        <span className="text-xs text-muted-foreground">· {t("common:units.min", { count: block.minutes })}</span>
                        {block.project_title && <span className="truncate text-xs text-muted-foreground">· {block.project_title}</span>}
                    </div>
                    <h3 className="font-medium text-foreground">{SessionBlockTypeOptions.find((o) => o.id === block.type)?.label ?? block.title}</h3>
                    <p className="text-sm text-muted-foreground">{getSessionBlockReason(block)}</p>
                </div>
            </div>
            <Button onClick={() => onStart(block)} loading={isStarting} className="sm:shrink-0">
                {getSessionBlockAction(block.type)}
            </Button>
        </li>
    );
};
