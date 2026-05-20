# Decision Insight Mini App

Decision Insight is a Ukrainian-language mini web application for recording complex life or work decisions and analyzing their quality with a real server-side LLM call.

The app implements registration, login, protected pages, PostgreSQL persistence, Prisma migrations, server-side LLM analysis, status handling, retry/re-analysis, and a deploy-ready README.

## Links

- GitHub repository URL: https://github.com/IRozinko/mini-app
- Demo URL: https://mini-app-zeta-ebon.vercel.app

The demo is deployed on Vercel and connected to a production PostgreSQL database. LLM analysis is executed server-side through an OpenAI-compatible provider; secrets are stored only as environment variables.

## Quick Start

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`, register a user, and create the first decision.

Live demo: https://mini-app-zeta-ebon.vercel.app

For real LLM analysis, set `LLM_API_KEY` in `.env`. Without a key, the app still saves decisions and shows a safe `FAILED` analysis state.

## Features

- Secure custom credentials auth with hashed passwords.
- Opaque HTTP-only session cookies stored as hashed tokens in PostgreSQL.
- Protected dashboard, new decision page, and decision details page.
- Per-user authorization and ownership checks on every server action/API route.
- Decision creation and editing with Zod validation and preserved form values on validation errors.
- Owner-only edit and delete actions for decisions.
- Real LLM integration through a server-only OpenAI-compatible chat completions endpoint.
- DB-backed analysis jobs with persisted `QUEUED`, `RUNNING`, `DONE`, and `FAILED` states.
- Latest structured analysis stored in `DecisionAnalysis` and successful analysis history stored in `DecisionAnalysisRun`.
- Basic per-user LLM rate limiting to protect against cost spikes.
- Status lifecycle: `PROCESSING`, `READY`, `FAILED`.
- Client-side polling while analysis is processing.
- Retry/re-analysis button for failed or existing analyses.
- Dashboard with status counts, category filter, status filter, quality sorting, and bias frequency summary.
- Empty, loading, processing, ready, failed, and validation states.

## Product Walkthrough

1. A visitor opens the landing page and chooses to register or log in.
2. After authentication, the user lands on a private dashboard with their own decision history.
3. The user creates a new decision record by describing the situation, the accepted decision, and optional reasoning.
4. The record is saved immediately with `PROCESSING` status and a database-backed `AnalysisJob` is queued.
5. The decision details page triggers the protected analysis endpoint, which processes the latest queued job and polls status until the analysis becomes `READY` or `FAILED`.
6. When the analysis is ready, the app shows the decision category, possible cognitive biases, missed alternatives, risk factors, reflection questions, practical next steps, and quality score.
7. The user can edit a decision, delete it, retry a failed analysis, or re-analyze an existing decision.
8. The dashboard summarizes all user decisions with status counters, category filters, sorting, score badges, and the most frequent cognitive biases.

## Evaluation Highlights

- The app uses real PostgreSQL persistence, not in-memory mock data.
- Authentication is implemented with hashed passwords and database-backed HTTP-only sessions.
- LLM calls happen only on the server; the API key is never exposed to the browser.
- Every decision and analysis operation is scoped to the authenticated user.
- The project includes Docker-based local database setup, Prisma migrations, unit tests, Playwright smoke testing, and GitHub Actions CI.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- bcryptjs
- Custom secure credentials auth
- OpenAI-compatible LLM API via server-side `fetch`

## Architecture

The application uses server components for protected pages and server actions/API routes for mutations.

- `app/actions/auth.ts` handles registration, login, and logout.
- `app/actions/decisions.ts` handles decision creation, editing, deletion, and re-analysis reset.
- `app/api/decisions/[id]/analyze/route.ts` processes the latest queued analysis job through server-side LLM analysis.
- `app/api/decisions/[id]/route.ts` returns owned decision status for polling and safely fails stale processing jobs.
- `lib/session.ts` creates and validates DB-backed sessions.
- `lib/analysis.ts` calls the LLM provider, parses JSON, validates it with Zod, and saves the result.
- `lib/analysis-jobs.ts` creates and processes DB-backed analysis jobs.
- `lib/analysis-rate-limit.ts` enforces a small per-user LLM request window.
- `prisma/schema.prisma` defines users, sessions, decisions, and analyses.

The frontend never receives an LLM API key and never submits a `userId`. The authenticated user is always resolved on the server from the session cookie.

## Database Schema

Core models:

- `User`: email, optional name, secure `passwordHash`, timestamps.
- `Session`: hashed opaque token, user relation, expiration.
- `Decision`: situation, accepted decision, optional reasoning, status, optional error message.
- `DecisionAnalysis`: one latest analysis per decision with structured JSON fields and provider/model metadata.
- `DecisionAnalysisRun`: immutable history entry for every successful analysis run.
- `AnalysisJob`: queued/running/done/failed analysis work for create, retry, re-analysis, and edit triggers.
- `AnalysisRequest`: timestamped per-user request records used for LLM rate limiting.

Relationships:

- User has many sessions.
- User has many decisions.
- Decision belongs to one user.
- Decision has zero or one latest analysis.
- Decision has many analysis history runs.
- Decision has many analysis jobs.
- DecisionAnalysis belongs to one decision.

Prisma migrations are included at:

```bash
prisma/migrations/20260519180000_init/migration.sql
prisma/migrations/20260520200000_analysis_jobs_history/migration.sql
```

## LLM Analysis Flow

1. A logged-in user submits a decision.
2. The server action validates input and saves a `Decision` with status `PROCESSING`.
3. The server action creates an `AnalysisJob` with trigger `CREATE`, `EDIT`, `RETRY`, or `REANALYZE`.
4. The user is redirected to the decision details page with `?start=1`.
5. A protected client runner calls `POST /api/decisions/:id/analyze`.
6. The API route verifies the session and decision ownership, applies per-user LLM rate limiting, and processes the latest queued job.
7. `lib/analysis.ts` sends the decision data to the configured LLM provider.
8. The response must be valid JSON and is normalized with Zod.
9. On success, the app upserts `DecisionAnalysis`, creates a `DecisionAnalysisRun`, marks the job `DONE`, and sets decision status `READY`.
10. On failure, the app marks the job `FAILED`, stores `FAILED` plus a safe error message on the decision, and logs technical details server-side only.
11. The details page polls status and refreshes when analysis completes. If a processing job becomes stale, the status endpoint marks it failed so the UI does not spin forever.

Expected LLM JSON:

```json
{
  "category": "string",
  "cognitiveBiases": [
    {
      "name": "string",
      "explanation": "string"
    }
  ],
  "missedAlternatives": [
    {
      "alternative": "string",
      "whyItMatters": "string"
    }
  ],
  "summary": "string",
  "risks": ["string"],
  "reflectionQuestions": ["string"],
  "nextSteps": ["string"],
  "qualityScore": 7
}
```

## Authentication

Auth is implemented without fake state:

- Passwords are hashed with bcrypt.
- Sessions use random opaque tokens.
- Only the HMAC hash of each session token is stored in the database.
- The browser receives an HTTP-only, same-site cookie.
- Production cookies are marked `secure`.
- Protected pages call `requireUser()`.
- Server actions and API routes resolve the user from the session and verify ownership.

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required values:

```bash
DATABASE_URL="postgresql://decision_user:decision_password@localhost:5432/decision_insight?schema=public"
SESSION_SECRET="replace-with-a-long-random-secret-at-least-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
LLM_API_KEY="your-provider-api-key"
LLM_MODEL="gpt-4o-mini"
LLM_BASE_URL="https://api.openai.com/v1"
LLM_TIMEOUT_MS="30000"
LLM_TEST_MODE=""
DEBUG_STORE_RAW_LLM_RESPONSE="false"
```

Notes:

- `SESSION_SECRET` is required outside strict local development and must be at least 32 characters. Generate one with `openssl rand -base64 48`.
- `LLM_BASE_URL` is OpenAI-compatible. For OpenAI, keep `https://api.openai.com/v1`.
- `LLM_TIMEOUT_MS` controls the server-side LLM request timeout.
- `LLM_TEST_MODE=mock` enables deterministic local smoke tests without an external LLM call.
- Raw LLM responses are not stored by default for privacy/data minimization. Set `DEBUG_STORE_RAW_LLM_RESPONSE=true` only temporarily when debugging; stored payloads are truncated.
- If `LLM_API_KEY` is missing, analysis correctly fails and stores a `FAILED` state.
- Do not commit `.env`.

## Local Setup

Requirements:

- Node.js 18.17+ (this environment used Node 18.19.0)
- npm
- Docker and Docker Compose

Copy environment variables:

```bash
cp .env.example .env
```

Start PostgreSQL in Docker:

```bash
npm run db:up
```

The local database runs on `localhost:5432` with:

- Database: `decision_insight`
- User: `decision_user`
- Password: `decision_password`

Stop the database:

```bash
npm run db:down
```

Delete local database data and start fresh:

```bash
npm run db:reset
```

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Equivalent direct Prisma commands:

```bash
npx prisma generate
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npm run db:studio
```

Start the development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

No seed user is required. Create a test user through the `Зареєструватися` page.

## Build and Verification

Run unit tests:

```bash
npm run test
```

Run optional Playwright smoke tests after the database is up and migrated:

```bash
LLM_TEST_MODE=mock npm run test:smoke
```

Run lint:

```bash
npm run lint
```

Run TypeScript:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

Verified in this environment:

- `npm run prisma:generate` passed.
- `npm run test` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

## CI/CD

GitHub Actions runs on pushes and pull requests to `main`.

The workflow:

- Starts a PostgreSQL 16 service.
- Runs `npm ci`.
- Runs `npx prisma generate`.
- Applies migrations with `npx prisma migrate deploy`.
- Runs unit tests.
- Runs lint.
- Runs TypeScript typecheck.
- Runs production build.

Recommended deployment flow:

- Vercel preview deployments for pull requests.
- Production deployment from `main`.
- Run `npx prisma migrate deploy` against the production database before or during production deploy.

## Screenshots

The live application is available at https://mini-app-zeta-ebon.vercel.app.

These screenshots were captured from the deployed Vercel demo.

| Screen | File |
| --- | --- |
| Landing page | [`docs/screenshots/landing.png`](docs/screenshots/landing.png) |
| Login page | [`docs/screenshots/login.png`](docs/screenshots/login.png) |
| Register page | [`docs/screenshots/register.png`](docs/screenshots/register.png) |
| Dashboard with one analyzed decision | [`docs/screenshots/dashboard.png`](docs/screenshots/dashboard.png) |
| Dashboard with multiple decisions and filters | [`docs/screenshots/dashboard-2.png`](docs/screenshots/dashboard-2.png) |
| Empty new decision form | [`docs/screenshots/new-decision.png`](docs/screenshots/new-decision.png) |
| New decision validation errors | [`docs/screenshots/new-decision-failed.png`](docs/screenshots/new-decision-failed.png) |
| Decision processing state | [`docs/screenshots/decision-analysis.png`](docs/screenshots/decision-analysis.png) |
| Successful analysis details | [`docs/screenshots/analysis-successful.png`](docs/screenshots/analysis-successful.png) |

### Landing

![Decision Insight landing page](docs/screenshots/landing.png)

### Authentication

![Login page](docs/screenshots/login.png)

![Register page](docs/screenshots/register.png)

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

![Dashboard with multiple decisions](docs/screenshots/dashboard-2.png)

### New Decision

![New decision form](docs/screenshots/new-decision.png)

![New decision validation errors](docs/screenshots/new-decision-failed.png)

### Analysis Flow

![Decision processing state](docs/screenshots/decision-analysis.png)

![Successful analysis details](docs/screenshots/analysis-successful.png)

## Manual Testing Checklist

1. Register a new user.
2. Log out.
3. Log in with the same user.
4. Confirm `/dashboard`, `/decisions/new`, and `/decisions/:id` redirect to login when logged out.
5. Create a decision with valid situation and accepted decision text.
6. Confirm the decision is saved and status shows `В обробці`.
7. Confirm LLM analysis is triggered through the server endpoint.
8. Confirm completed analysis shows category, biases, alternatives, summary, risks, questions, next steps, and score.
9. Temporarily remove `LLM_API_KEY`, create/retry a decision, and confirm `Помилка аналізу`.
10. Restore `LLM_API_KEY` and use `Повторити аналіз`.
11. Edit an existing decision and confirm it redirects to processing and creates a fresh analysis.
12. Delete a decision and confirm it disappears from the dashboard.
13. Create a second user and confirm they cannot view, edit, delete, or analyze the first user's decision URL.
14. Test dashboard filters and sorting.

## Deployment

### Current Vercel Demo

- Demo: https://mini-app-zeta-ebon.vercel.app
- Production branch: `main`
- Database: hosted PostgreSQL
- Runtime secrets: configured through Vercel Environment Variables

### Vercel

1. Push this repository to GitHub.
2. Create a PostgreSQL database, for example Neon, Supabase, Railway, or Vercel Postgres.
3. Import the GitHub repo in Vercel.
4. Set environment variables:

```bash
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=https://mini-app-zeta-ebon.vercel.app
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_TIMEOUT_MS=30000
DEBUG_STORE_RAW_LLM_RESPONSE=false
```

Do not set `LLM_TEST_MODE` in production. It is only for deterministic local/smoke tests.
`SESSION_SECRET` must be at least 32 characters in Vercel Preview and Production.

5. Set build command:

```bash
npm run build
```

6. Set install command:

```bash
npm install
```

7. Run migrations before or during deployment:

```bash
npm run prisma:deploy
```

On Vercel, a common production setup is to run `prisma migrate deploy` in a CI step or as a one-off command from a local machine with the production `DATABASE_URL`.

After changing Vercel environment variables, trigger a new deployment so the runtime receives the updated values.

### Railway or Render

1. Create a PostgreSQL service.
2. Create a web service from the GitHub repository.
3. Add the same environment variables.
4. Use:

```bash
npm install
npm run prisma:deploy
npm run build
npm run start
```

## Known Limitations

- Background analysis is DB-backed and persists job state, but processing is still triggered by the protected API route rather than a dedicated external worker. For high traffic, use a durable queue or worker system such as BullMQ, Inngest, Trigger.dev, or a managed queue.
- The UI shows the latest analysis by default and keeps a compact analysis history. A richer comparison view across analysis runs would be a future improvement.
- npm audit currently recommends a breaking Next.js major upgrade for current advisories. This project uses patched Next 14.2.35 because the provided environment runs Node 18 and the app builds successfully there. For a production launch on a newer Node runtime, evaluate upgrading to the latest supported Next major.
- Unit tests and a Playwright smoke test are included; a broader integration/e2e suite would be the next production-readiness step.

## Future Improvements

- Add email verification and password reset.
- Add a dedicated background worker or external queue for analysis processing.
- Expand Playwright coverage for access control, failed LLM analysis, and re-analysis.
- Add export to Markdown/PDF.
- Add richer analytics by category, bias, and score over time.
