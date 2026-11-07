-- Course structure: Project -> Unit -> Lesson -> content items (see docs / curriculum module)
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "units_project_id_order_index_idx" ON "units"("project_id", "order_index");
CREATE INDEX "lessons_project_id_idx" ON "lessons"("project_id");
CREATE INDEX "lessons_unit_id_order_index_idx" ON "lessons"("unit_id", "order_index");

ALTER TABLE "units" ADD CONSTRAINT "units_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_documents" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "study_documents_lesson_id_idx" ON "study_documents"("lesson_id");
ALTER TABLE "study_documents" ADD CONSTRAINT "study_documents_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "questions" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "questions_lesson_id_idx" ON "questions"("lesson_id");
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quizzes" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "quizzes_lesson_id_idx" ON "quizzes"("lesson_id");
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flashcard_decks" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "flashcard_decks_lesson_id_idx" ON "flashcard_decks"("lesson_id");
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notes" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "notes_lesson_id_idx" ON "notes"("lesson_id");
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "summaries" ADD COLUMN "lesson_id" TEXT;
CREATE INDEX "summaries_lesson_id_idx" ON "summaries"("lesson_id");
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

