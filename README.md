# Decision Insight Mini App

Decision Insight is a Ukrainian-language mini web application for recording complex life or work decisions and analyzing their quality with a real server-side LLM call.

The app implements registration, login, protected pages, PostgreSQL persistence, Prisma migrations, server-side LLM analysis, status handling, retry/re-analysis, and a deploy-ready README.

## Links

- GitHub repository URL: `TODO: add public GitHub repository URL`
- Demo URL: `TODO: add deployed demo URL`

Deployment was not performed from this environment because no hosting account or production database credentials were available. The project is ready to deploy; exact steps are below.

## Features

- Secure custom credentials auth with hashed passwords.
- Opaque HTTP-only session cookies stored as hashed tokens in PostgreSQL.
- Protected dashboard, new decision page, and decision details page.
- Per-user authorization and ownership checks on every server action/API route.
- Decision creation with Zod validation and preserved form values on validation errors.
- Real LLM integration through a server-only OpenAI-compatible chat completions endpoint.
- Structured analysis stored in `DecisionAnalysis`.
- Status lifecycle: `PROCESSING`, `READY`, `FAILED`.
- Client-side polling while analysis is processing.
- Retry/re-analysis button for failed or existing analyses.
- Dashboard with status counts, category filter, status filter, quality sorting, and bias frequency summary.
- Empty, loading, processing, ready, failed, and validation states.

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
- `app/actions/decisions.ts` handles decision creation and re-analysis reset.
- `app/api/decisions/[id]/analyze/route.ts` triggers server-side LLM analysis.
- `app/api/decisions/[id]/route.ts` returns owned decision status for polling.
- `lib/session.ts` creates and validates DB-backed sessions.
- `lib/analysis.ts` calls the LLM provider, parses JSON, validates it with Zod, and saves the result.
- `prisma/schema.prisma` defines users, sessions, decisions, and analyses.

The frontend never receives an LLM API key and never submits a `userId`. The authenticated user is always resolved on the server from the session cookie.

## Database Schema

Core models:

- `User`: email, optional name, secure `passwordHash`, timestamps.
- `Session`: hashed opaque token, user relation, expiration.
- `Decision`: situation, accepted decision, optional reasoning, status, optional error message.
- `DecisionAnalysis`: one latest analysis per decision with structured JSON fields and provider/model metadata.

Relationships:

- User has many sessions.
- User has many decisions.
- Decision belongs to one user.
- Decision has zero or one latest analysis.
- DecisionAnalysis belongs to one decision.

Prisma migration is included at:

```bash
prisma/migrations/20260519180000_init/migration.sql
```

## LLM Analysis Flow

1. A logged-in user submits a decision.
2. The server action validates input and saves a `Decision` with status `PROCESSING`.
3. The user is redirected to the decision details page with `?start=1`.
4. A protected client runner calls `POST /api/decisions/:id/analyze`.
5. The API route verifies the session and decision ownership.
6. `lib/analysis.ts` sends the decision data to the configured LLM provider.
7. The response must be valid JSON and is normalized with Zod.
8. On success, the app upserts `DecisionAnalysis` and sets status `READY`.
9. On failure, the app stores `FAILED` plus a safe error message.
10. The details page polls status and refreshes when analysis completes.

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
SESSION_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
LLM_API_KEY="your-provider-api-key"
LLM_MODEL="gpt-4o-mini"
LLM_BASE_URL="https://api.openai.com/v1"
```

Notes:

- `LLM_BASE_URL` is OpenAI-compatible. For OpenAI, keep `https://api.openai.com/v1`.
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
docker compose up -d postgres
```

The local database runs on `localhost:5432` with:

- Database: `decision_insight`
- User: `decision_user`
- Password: `decision_password`

Stop the database:

```bash
docker compose down
```

Delete local database data and start fresh:

```bash
docker compose down -v
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
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

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
11. Create a second user and confirm they cannot view the first user's decision URL.
12. Test dashboard filters and sorting.

## Deployment

### Vercel

1. Push this repository to GitHub.
2. Create a PostgreSQL database, for example Neon, Supabase, Railway, or Vercel Postgres.
3. Import the GitHub repo in Vercel.
4. Set environment variables:

```bash
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

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

- The “background” analysis is MVP-friendly: the details page calls a protected analysis endpoint and polls until completion. For high traffic, use a durable queue such as BullMQ, Inngest, Trigger.dev, or a managed queue.
- Only the latest analysis is stored per decision. Re-analysis replaces the previous structured analysis.
- npm audit currently recommends a breaking Next.js major upgrade for current advisories. This project uses patched Next 14.2.35 because the provided environment runs Node 18 and the app builds successfully there. For a production launch on a newer Node runtime, evaluate upgrading to the latest supported Next major.
- There are no automated integration tests; a manual testing checklist is included.

## Future Improvements

- Add email verification and password reset.
- Add a durable background job queue.
- Add automated Playwright flows for auth and decision analysis.
- Add export to Markdown/PDF.
- Add editable decisions with automatic re-analysis prompts.
- Add richer analytics by category, bias, and score over time.
