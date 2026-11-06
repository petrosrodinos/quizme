import { TextActions, type TextAction } from "@/features/ai-actions/interfaces/ai-actions.interfaces";

export const TextActionOptions: { id: TextAction; label: string; description: string }[] = [
    { id: TextActions.EXPLAIN, label: "Explain", description: "Explain the selection clearly" },
    { id: TextActions.SIMPLIFY, label: "Simplify", description: "Rewrite in simpler language" },
    { id: TextActions.SUMMARIZE, label: "Summarize", description: "Key points as bullets" },
    { id: TextActions.TRANSLATE, label: "Translate", description: "Translate into another language" },
    { id: TextActions.EXAMPLE, label: "Give an example", description: "Concrete illustrative examples" },
    { id: TextActions.BEGINNER, label: "Explain like I'm a beginner", description: "Everyday analogy, no jargon" },
    { id: TextActions.TECHNICAL, label: "More technical depth", description: "Mechanisms and precise terms" },
    { id: TextActions.COMPARE, label: "Compare with…", description: "Compare with another concept" },
    { id: TextActions.KEY_TERMS, label: "Find important terms", description: "Terms with short definitions" },
    { id: TextActions.FORMULA, label: "Explain formula", description: "Step-by-step formula breakdown" },
    { id: TextActions.ASK, label: "Ask AI", description: "Ask your own question" },
];

export const getTextActionLabel = (action: string): string => TextActionOptions.find((o) => o.id === action)?.label ?? action;
