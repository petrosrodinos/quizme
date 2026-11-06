import { tr } from "@/lib/i18n-options";
import { SessionBlockTypes, type SessionBlockType } from "@/features/study/interfaces/study.interfaces";

const block = (id: SessionBlockType) => ({
    id,
    get label(): string {
        return tr(`study:blocks.${id}.label`);
    },
    get action(): string {
        return tr(`study:blocks.${id}.action`);
    },
});

export const SessionBlockTypeOptions: { id: SessionBlockType; label: string; action: string }[] = [
    block(SessionBlockTypes.FLASHCARDS),
    block(SessionBlockTypes.WEAK_TOPICS),
    block(SessionBlockTypes.ADAPTIVE_QUIZ),
    block(SessionBlockTypes.RECALL),
    block(SessionBlockTypes.EXAM),
    block(SessionBlockTypes.UPLOAD),
];

export const getSessionBlockAction = (type: string) => SessionBlockTypeOptions.find((o) => o.id === type)?.action ?? tr("common:actions.start");
