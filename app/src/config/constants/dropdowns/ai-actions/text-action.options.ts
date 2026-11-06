import { TextActions, type TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";
import { tOption } from "@/lib/i18n-options";

const action = (id: TextAction) => tOption(id, `reader:actions.${id}.label`, `reader:actions.${id}.description`) as { id: TextAction; label: string; description: string };

export const TextActionOptions: { id: TextAction; label: string; description: string }[] = [
    action(TextActions.EXPLAIN),
    action(TextActions.SIMPLIFY),
    action(TextActions.SUMMARIZE),
    action(TextActions.TRANSLATE),
    action(TextActions.EXAMPLE),
    action(TextActions.BEGINNER),
    action(TextActions.TECHNICAL),
    action(TextActions.COMPARE),
    action(TextActions.KEY_TERMS),
    action(TextActions.FORMULA),
    action(TextActions.ASK),
];

export const getTextActionLabel = (action: string): string => TextActionOptions.find((o) => o.id === action)?.label ?? action;
