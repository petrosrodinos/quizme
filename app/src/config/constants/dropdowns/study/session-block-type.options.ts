import { SessionBlockTypes, type SessionBlockType } from "@/features/study/interfaces/study.interfaces";

export const SessionBlockTypeOptions: { id: SessionBlockType; label: string; action: string }[] = [
    { id: SessionBlockTypes.FLASHCARDS, label: "Flashcard review", action: "Review cards" },
    { id: SessionBlockTypes.WEAK_TOPICS, label: "Weak topics", action: "Practise weak spots" },
    { id: SessionBlockTypes.ADAPTIVE_QUIZ, label: "Adaptive quiz", action: "Start quiz" },
    { id: SessionBlockTypes.RECALL, label: "Explain concepts", action: "Start recall" },
    { id: SessionBlockTypes.EXAM, label: "Exam simulation", action: "Set up exam" },
    { id: SessionBlockTypes.UPLOAD, label: "Upload material", action: "Upload" },
];

export const getSessionBlockAction = (type: string) => SessionBlockTypeOptions.find((o) => o.id === type)?.action ?? "Start";
