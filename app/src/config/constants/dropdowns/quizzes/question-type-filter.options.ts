import type { QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { QuestionTypeFormOptions } from "./question-type-form.options";

export const QuestionTypeFilterOptions: { id: QuestionType | "all"; label: string }[] = [{ id: "all", label: "All types" }, ...QuestionTypeFormOptions];
