# AGENTS.md — Personal AI Nutrition Platform Operating Rules

This file governs all agentic and engineering operations across this codebase. These rules are persistent and must be adhered to across all sessions.

---

## 1. Operating Contract (Hard Rules)

1. **Phase Gates & Approvals**: Work strictly in the phases defined in Section 14. After each phase: run lint, type-check, unit tests, and relevant E2E tests; fix failures; produce a short phase report (what was built, what was tested, what is not done, what the user must configure). Then stop and wait for the user's explicit "proceed".
2. **Honesty & Verification**: Never claim a feature works unless it was implemented and tested. Never claim deployment succeeded unless it did. Explicitly state "not verified" when verification was not possible.
3. **Stop & Ask Triggers**: Stop and ask the user before:
   - Needing any external secret or credential (API keys, tokens).
   - Installing packages outside the declared technology stack.
   - Executing any destructive database operation.
   - Deploying to production or hosting providers.
   - Modifying a schema already applied in production.
   - Any licensing, attribution, or terms of use questions regarding a data source.
4. **Current & Maintained Dependencies**: Use maintained, current dependency versions. Check official documentation for Next.js, Supabase, `@google/genai`, Tailwind CSS, shadcn/ui, and PWA tooling. Avoid deprecated packages.
5. **Secret Hygiene**: Secrets only exist in environment variables. Provide `.env.example` with placeholders only. Never expose service-role keys or `GEMINI_API_KEY` to client-side code.
6. **LLM as Interpreter, Deterministic Core**: The LLM interprets and explains. Deterministic backend code does all arithmetic, aggregation, permissions, and persistence. The LLM is never the sole source of nutrition numbers and never receives direct or unrestricted database access.
7. **Unknown is Not Zero**: Missing nutrient values must be stored and displayed as "unknown" or "unavailable", never assumed to be zero. Unlogged food is never assumed to be zero intake.
8. **Estimates Must Be Labelled**: Estimates must always be clearly labelled as estimates. Never present an estimate as verified. Never fabricate prices, nutrition values, availability, recipe yields, or serving sizes.

---

## 2. Technology Decisions

- **Frontend / Backend**: Next.js (App Router, Server Actions, Route Handlers) + TypeScript (strict mode).
- **UI & Design**: Tailwind CSS + shadcn/ui patterns. Charts: Recharts. Validation: Zod everywhere (API input, LLM output, environment variables).
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth (SSR). Migrations in `supabase/migrations`. Row Level Security (RLS) on every user table (`auth.uid() = user_id`).
- **AI & LLM**: Google Gemini via the official `@google/genai` SDK, server-side only. Structured output (JSON schema) for parsing, recommendations, and plans. Function calling for chat retrieval tools. Environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL_FAST` (e.g. `gemini-2.5-flash`), `GEMINI_MODEL_PRO` (e.g. `gemini-2.5-pro`). SDK wrapped in a resilient `LLMClient` with retries, timeouts, schema validation, and typed error states.
- **Nutrition Data**: USDA FoodData Central API as primary source. Caching layer in PostgreSQL with source, source ID, retrieval timestamp, and preparation state. Evaluate Indian Food Composition Tables (IFCT) and Open Food Facts with licensing checks before bundling.
- **Hosting**: Vercel + Supabase (primary). Google Cloud Run (containerized Next.js) documented as an alternative.
- **PWA**: Maintained Next.js PWA configuration with manifest, icons, service worker offline handling, and Lighthouse audit validation.
- **Rate Limiting**: Persistent store (Redis/Upstash or Postgres-backed limiter) to avoid memory loss across serverless instances.
- **Testing**: Vitest for unit & integration testing, Playwright for E2E testing (including mobile viewports).

---

## 3. Privacy and AI-Data Rules

- **Minimal Data Transmission**: Send Gemini only the minimum relevant records necessary for the specific prompt (never send credentials or unrelated personal data).
- **Gemini Free-Tier Privacy Notice**: Warn clearly in documentation that the Gemini free tier may use submitted content for Google product improvements; recommend a paid-tier API key for sensitive personal health data.
- **Allow-Listed Retrieval Tools Only**: AI chat and recommendations access data strictly through authenticated, user-scoped server functions (e.g. `get_today_totals`, `get_goals`, `get_food_history`, `get_profile_constraints`). Gemini cannot execute arbitrary SQL or bypass authorization.
- **Explicit Confirmation Gates**: Explicit user confirmation is strictly required before:
  - Saving food entries to the diary.
  - Modifying nutrition targets.
  - Deleting records.
  - Logging a recommended meal as eaten.
- **Idempotency**: All mutation endpoints use client-generated idempotency keys to prevent duplicate records from rapid clicks or network retries.

---

## 4. User Profile Defaults (Sarveswar)

- **Name**: Sarveswar
- **Sex**: Male
- **Height**: 175.5 cm
- **Current Weight**: 75 kg
- **Activity Level**: Regular gym workouts
- **Time Zone**: `Asia/Kolkata`
- **Preferred Dinner Cutoff**: 7:00 PM
- **Exclusions**: Whey protein is strictly excluded from all recommendations
- **Food Context**: Limited cooking; favour practical PG-friendly and restaurant-accessible meals
- **Age**: Confirm during onboarding (do not assume)
- **Initial Targets**: 2,400 kcal, 150g Protein, 290g Carbs, 70g Fat, 35g Fibre, 3,000 ml Water (Mifflin-St Jeor recommendation presented alongside manual targets)
