# QuizMe — Architecture & Decisions

QuizMe is a multi-user AI study platform: users upload their own material, which is processed into a searchable knowledge layer that powers grounded tutoring, quizzes, flashcards, summaries, adaptive practice, exam simulation and collaboration.

```
app/  React 19 + Vite + shadcn/ui + TanStack Query + Zustand + socket.io-client
api/  NestJS 12 + Prisma 7 (PostgreSQL) + Vercel AI SDK + Socket.IO
```

## Backend layout (`api/src`)

| Layer | Contents |
| --- | --- |
| `core/` | Prisma, Postgres-backed **job queue** (`jobs`), **realtime** gateway (Socket.IO), private **storage** (GCS or local disk) + signed file URLs |
| `shared/` | JWT guard, `ProjectAccessService` (authorization), audit log, domain event bus, config/env validation, utils |
| `integrations/` | AI provider adapter (`LlmProviderService`), local NLP utilities, transactional mail |
| `modules/` | Feature domains (below) |

Domains: `auth`, `users`, `projects`, `documents` (upload + processing pipeline), `knowledge` (RAG retrieval + search), `ai` (task orchestration), `topics` (knowledge map + mastery), `questions` (bank + grading), `quizzes` (generation, attempts, adaptive, review, exam), `flashcards` (SRS), `notes`, `summaries`, `learning` (text/word actions, active recall, teach-back), `tutor` (RAG chat + Socratic), `study` (readiness, plan, daily session, analytics, dashboard), `gamification`, `notifications`, `collaboration` (members, invitations, shares, organizations), `rooms` (study rooms + multiplayer), `exports`.

## Key decisions

### 1. Large-document pipeline (never send whole documents to the LLM)
`Upload → Processing → Extracting → Chunking → Indexing → Ready | Failed`, run as a background job with live status over Socket.IO.

- **Validation**: extension allow-list, magic-byte check (`%PDF-`, ZIP for DOCX, no NUL bytes in text), size limit, max 10 files per request, SHA-256 **dedup per project**.
- **Extraction**: PDF via `unpdf` (per page → page numbers), DOCX via `mammoth` (HTML → real headings), Markdown headings, heuristic headings for TXT/PDF. New formats plug into `SupportedFormats` + `extractDocument`.
- **Structure-aware chunking** (~450 tokens, max 700): never crosses section boundaries, keeps paragraphs whole, splits long ones on sentences, 1-sentence overlap; each chunk stores its heading path, page range and keywords.
- **Embeddings**: OpenAI `text-embedding-3-small` @ 512 dims (batched). Embeddings are **reused by content hash** on re-upload/reprocess. Offline fallback: signed feature-hashing embeddings.
- **Knowledge map**: after processing, a job builds a topic hierarchy (LLM over section titles/excerpts, falling back to the document outline) and assigns chunks → topics.

### 2. Retrieval (RAG)
Hybrid search = vector cosine (in-memory per-project index, rebuilt when the project's chunk signature changes) **+** Postgres full-text (`ts_rank_cd`, GIN index), fused with **Reciprocal Rank Fusion** and filtered by project/document/topic. Retrieval only ever receives project ids the caller is authorized for → no cross-tenant leakage. The only raw SQL in the codebase is this parameterized FTS query (Prisma has no tsvector support).

*Scaling note*: pgvector was not available on the target database. The in-memory index comfortably handles tens of thousands of chunks per project; switching to pgvector/HNSW is isolated to `KnowledgeService.vectorSearch`.

### 3. AI layer
- `LlmProviderService` wraps the Vercel AI SDK; providers are configuration (`AI_PROVIDER`, `AI_MODEL_FAST`, `AI_MODEL_SMART`): OpenAI or Anthropic today. Features ask for a **tier** (`fast` for bulk structured generation/grading, `smart` for tutoring and summaries).
- `AiService` exposes **task-level** methods (generate questions/flashcards, summarize, tutor reply, evaluate answer, text action, word lookup, recall prompts). All application data uses **structured outputs** (zod schemas), never free-form parsing.
- **Grounding & quality**: every generated question must cite a passage and include a supporting quote that must overlap with that passage; MCQs with duplicate options, multiple unintended correct answers or "all of the above" are rejected; duplicates are blocked by content hash + near-duplicate token overlap; prior prompts are passed as "avoid". Each question stores source document/page/section, topic, difficulty, type, model and generation time.
- **Cost control**: per-user rolling 24h token budget, `ai_usage` ledger (tokens + estimated cost per task), `ai_cache` for deterministic tasks (text actions, word lookups), summaries cached by source fingerprint, embedding reuse, map/reduce batching, throttled endpoints, retries with backoff.
- **Large summaries**: hierarchical map/reduce (sections → notes → final level-specific summary).

### 4. Background jobs
A durable **Postgres-backed queue** (`jobs` table) with atomic claim (`updateMany where status=PENDING`), priorities, dedupe keys, retries with exponential backoff, permanent-failure errors, crash recovery and realtime progress. Redis was not required for the target environment; `JobsService` is the single seam to swap in BullMQ. Run dedicated workers by setting `WORKER_ENABLED=false` on web replicas.

### 5. Learning engine
- **Grading** is server-side for all 7 types (MCQ, multi-select, true/false, fill-blank with typo tolerance, matching, ordering with partial credit, free text via AI rubric evaluation). Clients never receive answers before answering; matching/ordering are shuffled deterministically.
- **Adaptive quizzes**: a learner profile (accuracy by difficulty, recent accuracy, repeatedly missed concepts, weak topics) drives target difficulty and a mix of retries, *new* questions on missed concepts, and fresh material.
- **Wrong-answer review**: retry all/attempt/topic, or generate new questions testing the same concepts.
- **Topic mastery**: recency- and difficulty-weighted accuracy over the last 20 responses, damped by a confidence factor; mastery ≥ 85 % with ≥ 5 answers emits `topic.mastered`.
- **Spaced repetition**: SM-2 with learning/relearning steps; statuses New → Learning → Known (≥21 d) / Needs review (lapsed). Queue priority: frequently forgotten → recently incorrect → overdue → new (capped).
- **Exam readiness**: weighted quiz performance, recent performance, hard-question accuracy, retention, topic mastery and exam simulations, penalized by untested topics; returns human-readable blockers.
- **Exam mode**: timed, server-enforced deadline, answers editable until submission, no feedback/XP until the results screen; free-text grading deferred to submission.

### 6. Gamification as a separate domain
Features emit domain events (`question.answered`, `quiz.completed`, `card.reviewed`, `recall.evaluated`, `topic.mastered`, …). `GamificationService` subscribes and maintains an immutable **XP ledger** (`xp_events`), levels (`100·n^1.5`), streaks in the user's timezone with freezes (1 per 7-day streak, max 2), daily goals, data-driven achievements (seeded from `gamification.config.ts`) and opt-in weekly leaderboards. Anti-farming windows prevent XP from repeated retries/reviews. XP, level-ups, achievements, streaks and goal completion are pushed over Socket.IO; the client plays synthesized (Web Audio, in-house) sounds and animations that respect preferences, focus mode, exam mode and `prefers-reduced-motion`.

### 7. Security & tenancy
- JWT (Bearer) bound to a server-side **session** (revocable logout, session list, revoke others; password change/reset revokes sessions). bcrypt (12 rounds). Email verification and reset tokens are random, hashed at rest, single use and expiring.
- **Authorization on every resource** via `ProjectAccessService` (roles Owner > Admin > Editor > Contributor > Viewer); unauthorized resources return 404 to avoid leaking existence. Role changes cannot exceed the actor's own rank.
- Private files: unguessable keys, bucket IAM (uniform access), served only through **short-lived signed URLs**; never public.
- Helmet, CORS allow-list, global validation (whitelist + forbid unknown), throttling (global + stricter on auth/AI), CSV-injection-safe exports, audit log for sensitive actions, env validated at boot.

### 8. Realtime
One authenticated Socket.IO server (JWT + session check in the handshake). Sockets join `user:<id>`; study rooms (`room:<id>`) and games (`game:<id>`) are joined after authorization. Multiplayer timers are in-process; for horizontal scaling add the Socket.IO Redis adapter and move timers to the job queue.

## Frontend (`app/src`)
Feature modules (`features/<domain>/{services,hooks,interfaces}`) are data-only; UI lives in `pages/**`. Central `Routes`/`ApiRoutes` objects, TanStack Query for server state, Zustand stores (auth, preferences, celebrations), `useFeedback()` for sound/haptics/animations, `useRealtimeEvent()` for socket events.

## Future extensions (designed for)
Voice tutor / speech answers (the recall page already uses the Web Speech API), new source types (add an extractor), Google Drive/Notion import (new upload source → same pipeline), organizations/classrooms (organizations + shares exist), instructor exams (question bank + exam mode), offline mode (SRS state is per-card and portable), mobile apps (REST + Socket.IO API).
