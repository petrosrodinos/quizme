-- Language of all generated content + AI tutor replies for a project (see shared/i18n/languages.ts)
ALTER TABLE "projects" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
