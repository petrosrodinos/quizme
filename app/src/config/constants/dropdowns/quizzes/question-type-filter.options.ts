import type { QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { tOption } from "@/lib/i18n-options";
import { QuestionTypeFormOptions } from "./question-type-form.options";

export const QuestionTypeFilterOptions: { id: QuestionType | "all"; label: string }[] = [tOption("all", "quiz:filters.allTypes"), ...QuestionTypeFormOptions];
