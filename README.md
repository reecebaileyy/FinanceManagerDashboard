# Finance Manager Dashboard

This repository contains the Next.js App Router shell for the Finance Manager platform described in `docs/architecture.md` and `CS490 Starter 26.pdf`. It stitches together the landing, authentication previews, and dashboard mock modules while the backend services are implemented as independent Node.js microservices (see the docs for interfaces and contracts).

## Prerequisites
- Node.js 20.x and npm 10.x
- PostgreSQL 15 and Redis 7 for local prototyping (Docker compose templates arrive in later tasks)
- Access to Plaid, Azure OpenAI, Twilio, AWS accounts for staging/production secrets

## Environment configuration
1. Copy the example file that matches your target stage:
   - Local: `cp .env.local.example .env.local`
   - Staging: `cp .env.staging.example .env.staging`
   - Production: `cp .env.production.example .env.production`
2. Replace placeholder values with real credentials or configure your secrets provider to inject them at runtime. The example files show the minimum shape and reference where secrets should come from (AWS Secrets Manager, Doppler, etc.).
3. Run `npm install` (or `pnpm install`) and then `npm run env:check`. The script loads the relevant `.env.*` file, validates it with the shared Zod schemas, and ensures both server and client variables stay in sync.

`src/lib/config/env/` exposes `getServerEnv`/`getClientEnv` helpers so components and services can read configuration in a typed way without leaking secrets into the browser bundle. The helper normalises blank values, enforces required keys per environment, and caches results for repeated lookups.

## Scripts
- `npm run dev` – start the Next.js development server
- `npm run build` / `npm run start` – build and serve the production bundle
- `npm run lint` / `npm run lint:fix` – lint the repository with the hardened ESLint setup
- `npm run typecheck` – run the TypeScript compiler in no-emit mode
- `npm run format` / `npm run format:check` – Prettier formatting helpers
- `npm run env:check` – validate environment variables against the Zod schemas
- `npm run prepare` – install Husky hooks

## Repository layout
- `src/app` – Next.js App Router entry points (`layout.tsx`, `page.tsx`, global styles)
- `src/components` – reusable dashboard UI primitives (sidebar, top bar, cards)
- `src/features` – feature-specific sections rendered inside the dashboard shell
- `src/lib/config/env` – strongly typed environment configuration helpers
- `docs/` – architecture, API contracts, domain model, non-functional requirements, and tech stack references

For deeper context on service boundaries, API contracts, and non-functional commitments refer to the documents inside `docs/` alongside the annotated `task` backlog.
