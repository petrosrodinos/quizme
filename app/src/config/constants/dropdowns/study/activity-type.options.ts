import { StudyActivityTypes, type StudyActivityType } from "@/features/study/interfaces/study.interfaces";

export const StudyActivityTypeOptions: { id: StudyActivityType; label: string }[] = [
    { id: StudyActivityTypes.FLASHCARDS, label: "Flashcards" },
    { id: StudyActivityTypes.QUIZ, label: "Quiz" },
    { id: StudyActivityTypes.EXAM, label: "Exam simulation" },
    { id: StudyActivityTypes.RECALL, label: "Active recall" },
    { id: StudyActivityTypes.TEACH_BACK, label: "Teach it back" },
    { id: StudyActivityTypes.TUTOR, label: "AI tutor" },
    { id: StudyActivityTypes.READING, label: "Reading" },
    { id: StudyActivityTypes.DAILY_SESSION, label: "Daily session" },
    { id: StudyActivityTypes.ROOM, label: "Study room" },
];
