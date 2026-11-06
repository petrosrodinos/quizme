# QuizMe — AI Study & Exam Preparation Platform

Upload your study material and QuizMe turns it into a personal learning system: grounded AI tutor (with a Socratic mode), adaptive quizzes (7 question types), wrong-answer review, spaced-repetition flashcards, multi-level summaries, active recall & "teach it back", knowledge map with mastery, exam simulation, readiness score, study plans, gamification, collaboration, study rooms and multiplayer quizzes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and [docs/Product_Specification.md](docs/Product_Specification.md) for the full spec.

## Requirements
- Node.js ≥ 22.12, PostgreSQL ≥ 14
- An OpenAI (or Anthropic) API key for AI features
- Optional: Google Cloud Storage bucket (otherwise local disk), Resend (otherwise emails are logged)

## Run locally

```bash
# API
cd api
npm install
cp .env.template .env.staging          # fill DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, ...
npx dotenv run -f .env.staging -- npx prisma migrate deploy
npm run start:staging                  # http://localhost:3000/api  (Swagger: /api/docs)

# Web app
cd ../app
npm install
cp .env.template .env                  # VITE_API_URL=http://localhost:3000/api, VITE_SOCKET_URL=http://localhost:3000
npm run dev                            # http://localhost:5173
```

## Tests
```bash
cd api
npm test            # unit tests (SRS, grading/validation, gamification rules, chunking, NLP)
npm run test:e2e    # black-box API tests against a running API (auth, tenancy, roles, sessions)
cd ../app && npm run build   # type-check + production build
```

## Deploy
- `docker compose up --build` builds the API (runs migrations on start) and the SPA (nginx). Put secrets in `api/.env.production`.
- Environments: `.env.local`, `.env.development`, `.env.staging`, `.env.production` (see `api/.env.template`). Never commit real secrets.
- Scale: run extra API replicas with `WORKER_ENABLED=false` plus a dedicated worker (`docker compose --profile worker up`). For multiple realtime nodes add the Socket.IO Redis adapter.
