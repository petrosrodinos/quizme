import { tOption } from "@/lib/i18n-options";
import { StudyActivityTypes, type StudyActivityType } from "@/features/study/interfaces/study.interfaces";

export const StudyActivityTypeOptions: { id: StudyActivityType; label: string }[] = [
    tOption(StudyActivityTypes.FLASHCARDS, "study:activityTypes.FLASHCARDS"),
    tOption(StudyActivityTypes.QUIZ, "study:activityTypes.QUIZ"),
    tOption(StudyActivityTypes.EXAM, "study:activityTypes.EXAM"),
    tOption(StudyActivityTypes.RECALL, "study:activityTypes.RECALL"),
    tOption(StudyActivityTypes.TEACH_BACK, "study:activityTypes.TEACH_BACK"),
    tOption(StudyActivityTypes.TUTOR, "study:activityTypes.TUTOR"),
    tOption(StudyActivityTypes.READING, "study:activityTypes.READING"),
    tOption(StudyActivityTypes.DAILY_SESSION, "study:activityTypes.DAILY_SESSION"),
    tOption(StudyActivityTypes.ROOM, "study:activityTypes.ROOM"),
];
