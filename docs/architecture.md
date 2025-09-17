# Finance Manager Dashboard Architecture

## 1. Architecture Overview
- Customer-facing web app built with Next.js App Router (TypeScript) delivers landing, marketing, and authenticated dashboard experiences described in the CS490 proposal ("CS490 Starter 26.pdf").
- Backend domain logic is organized as independently deployable Node.js (TypeScript + Fastify) microservices aligned to core capabilities: identity, accounts, transactions, budgets, goals, bills, savings automation, insights, notifications, reporting, and admin tooling.
- PostgreSQL is the system of record. Each service owns a schema in a shared cluster (AWS RDS Aurora PostgreSQL) with Prisma as the ORM and migration tool. Read replicas sit behind PgBouncer for scale-out queries.
- An API Gateway/BFF fronts the microservices, terminates TLS, enforces authentication and authorization, shapes responses for the frontend, and exposes public REST APIs where noted in the PDF.
- Cross-service messaging uses BullMQ (Redis) for durable queues and scheduled jobs; event emissions (for example `transaction.categorized`, `bill.due-soon`) feed downstream analytics, notifications, and AI workflows.
- Shared observability stack: OpenTelemetry traces plus structured JSON logs to OpenSearch, metrics via Prometheus and Grafana, alerts wired to OpsGenie. Security controls include JWT session tokens, HSTS, CSP, rate limiting, and AWS Secrets Manager backed configuration.

## 2. Deployment Topology
- **Frontend**: Static assets via CloudFront and S3, dynamic routes on Vercel or AWS ECS Fargate, backed by the API gateway over private VPC links.
- **API Gateway**: Node.js Fastify service running on ECS Fargate, fronted by AWS Application Load Balancer. Handles request fan-out, caching (Redis), schema validation (Zod), and threat protection (AWS WAF plus Shield).
- **Microservices**: Containerized with Docker, orchestrated via ECS (Fargate). Each service gets CI/CD pipelines (GitHub Actions) for lint, test, build, and deploy to staging and production.
- **Data Layer**: Aurora PostgreSQL (primary plus replica). Redis Enterprise for queues and caching. S3 buckets for report exports and document storage. Secrets in AWS Secrets Manager.
- **Integrations**: Plaid for bank-linking, Twilio or SendGrid for SMS and email, LLM vendor (OpenAI or Azure OpenAI) for the AI assistant, PostHog for product analytics.

## 3. Frontend (Next.js App Router)
- Implements the navigation map from the PDF: landing, auth, dashboard, transactions, budgets, goals, bills, savings automation, insights and AI, reports, settings, admin, and customization modes.
- Uses Tailwind CSS with a custom design token system for light and dark themes. Component library is built on Radix UI primitives with shadcn/ui styling conventions to speed delivery while honoring accessibility targets.
- State management via TanStack Query for server data and Zustand for client-only state (for example layout editing, theme toggles). SSR-aware session context reads gateway-issued cookies, while React Query fetchers hit the API gateway.
- Implements role-based route guards (public, authenticated, admin) via middleware in `src/middleware.ts`. Layout shell includes lazy sidebar, top bar, widget grid, and cross-device responsive breakpoints.
- Shared UI packages (for example chart kit built on Recharts, form kit built on React Hook Form plus Zod) live under `src/components` to support rapid feature iteration.

## 4. API Gateway / BFF Responsibilities
- Terminates OAuth or OIDC login flows, exchanges codes with the Auth service, and sets HTTP-only session cookies (JWT plus refresh token).
- Maps REST endpoints consumed by the frontend to service calls, composing results where the UI needs aggregated data (for example dashboard overview combining KPIs from transactions, budgets, goals, notifications).
- Enforces RBAC using signed JWT scopes and queries the User Profile service for fine-grained settings (for example feature flags, widget layouts).
- Provides pagination, filtering, and caching helpers so individual services can remain focused on domain logic.
- Surfaces public webhook endpoints (Plaid, payment providers) and proxies them to internal services with signature validation.

## 5. Microservice Contracts
Each service exposes REST endpoints (JSON over HTTPS) under `/api/{service}` via the gateway. Internal service-to-service calls use mutual TLS over the private VPC; async workflows publish or consume queue events noted below.

### 5.1 Auth and Security Service
- **Domain**: user accounts, credentials, session tokens, MFA secrets, audit trails.
- **Data**: `users`, `password_credentials`, `mfa_secret`, `refresh_tokens`, `audit_events` tables.
- **Endpoints**:
  - `POST /api/auth/signup` -> create user, send verification email.
  - `POST /api/auth/login` -> email and password auth, returns session plus refresh token.
  - `POST /api/auth/refresh` -> rotate tokens.
  - `POST /api/auth/logout` -> revoke refresh token, clear session.
  - `POST /api/auth/password/reset-request` and `POST /api/auth/password/reset`.
  - `POST /api/auth/mfa/setup` (TOTP enrollment) and `POST /api/auth/mfa/verify`.
- **Events**: `user.registered`, `user.login.failed`, `mfa.challenge.required`.
- **Notes**: Implements Argon2 hashing, rate limiting, IP or device fingerprinting, backup codes, and audit logging mandated in the PDF security section.

### 5.2 User Profile Service
- **Domain**: profile metadata, preferences (theme, notifications, dashboard layout), connected institutions metadata.
- **Endpoints**:
  - `GET /api/profile` and `PUT /api/profile` -> view or update profile.
  - `GET /api/profile/preferences` and `PUT /api/profile/preferences` -> toggle theme, AI opt-in, notification channels.
  - `PUT /api/profile/widgets` -> persist drag-and-drop dashboard layout.
- **Events**: `profile.updated`, `preferences.changed` to notify frontend caches and the Notification service.

### 5.3 Accounts Service
- **Domain**: linked financial accounts, balances, institutions, Plaid item tokens.
- **Endpoints**:
  - `POST /api/accounts/link` -> initiate Plaid link, exchange public token.
  - `GET /api/accounts` -> list accounts with balances and history snapshots.
  - `PATCH /api/accounts/:accountId` -> update nickname, status, or archive.
  - `DELETE /api/accounts/:accountId` -> unlink account with data retention workflow.
- **Events**: `account.linked`, `account.balance.updated` feed Transactions and Budget services.
- **Jobs**: nightly balance snapshots, webhook ingestion from Plaid.

### 5.4 Transactions Service
- **Domain**: normalized transactions, categories, tagging rules, reconciliation state.
- **Endpoints**:
  - `GET /api/transactions` with filters for date range, account, category, amount, free text.
  - `POST /api/transactions/import` -> CSV upload (S3 presigned) that triggers an asynchronous processing job.
  - `PATCH /api/transactions/:id` -> edit category, notes, tags.
  - `POST /api/transactions/bulk-tag` -> bulk update tags or categories.
- **Events**: `transaction.ingested`, `transaction.categorized`, `transaction.reconciled`.
- **Notes**: Supports optimistic updates for quick tag edits per UX requirement.

### 5.5 Budget Service
- **Domain**: recurring budgets, allocations, variance tracking, rollover rules.
- **Endpoints**:
  - `GET /api/budgets` and `POST /api/budgets` -> list or create budgets.
  - `PATCH /api/budgets/:id` -> adjust allocations or thresholds.
  - `GET /api/budgets/:id/summary` -> monthly variance plus recommendations.
- **Events**: `budget.created`, `budget.threshold.exceeded`, `budget.monthly.rollover`.
- **Jobs**: monthly cron to close periods and trigger summary exports.

### 5.6 Goals Service
- **Domain**: savings goals, timelines, progress, AI recommendation hooks.
- **Endpoints**:
  - `POST /api/goals` -> create goal (target amount, due date, funding plan).
  - `GET /api/goals` -> list with progress metrics.
  - `PATCH /api/goals/:id` -> adjust parameters.
  - `POST /api/goals/:id/recommendation` -> request AI improvement suggestions (delegates to AI Insight service).
- **Events**: `goal.updated`, `goal.completed` consumed by Notification and Insights.

### 5.7 Bills and Reminders Service
- **Domain**: recurring bills, subscriptions, reminder schedules, payment state.
- **Endpoints**:
  - `POST /api/bills` and `GET /api/bills`.
  - `PATCH /api/bills/:id` -> update dates or auto-pay settings.
  - `POST /api/bills/:id/mark-paid` -> update payment status.
- **Events**: `bill.due-soon`, `bill.paid`, `bill.overdue` (drives notifications and dashboards).
- **Jobs**: scheduled reminders via BullMQ, email or SMS triggered by Notification service.

### 5.8 Savings Automation Service
- **Domain**: rules for automatic transfers (fixed, percentage, round-up), scheduling.
- **Endpoints**:
  - `POST /api/savings/rules` and `GET /api/savings/rules`.
  - `PATCH /api/savings/rules/:id` -> enable or disable, modify thresholds.
  - `POST /api/savings/rules/:id/run` -> manual trigger for debugging or user-driven execution.
- **Events**: `savings.rule.created`, `savings.transfer.scheduled`, `savings.transfer.failed`.
- **Integrations**: with external payment rails (future) or mocked for capstone scope.

### 5.9 Notification Service
- **Domain**: omnichannel messaging (email, SMS, in-app), templates, delivery logs.
- **Endpoints**:
  - `POST /api/notifications/test` -> send preview to the current user (admin only).
  - Internal only: `POST /internal/notifications/dispatch` consumed by other services.
  - `GET /api/notifications/preferences` and `PUT /api/notifications/preferences` -> match PDF requirement for user-managed channels.
- **Events**: listens to all domain events to fan out templated communications.

### 5.10 AI Insight Service
- **Domain**: orchestrates LLM prompts, conversation history, suggested actions.
- **Endpoints**:
  - `POST /api/insights/chat` -> streaming conversation endpoint (Next.js route uses Server-Sent Events).
  - `POST /api/insights/summarize` -> nightly summary job for dashboard alerts.
  - `GET /api/insights/recommendations` -> fetch latest actions for the Insights feed.
- **Events**: consumes `transaction.categorized`, `budget.threshold.exceeded`, `goal.updated` to contextualize advice.
- **Notes**: Applies guardrails (content filtering, disclaimers) per security and compliance section of the proposal.

### 5.11 Reporting and Export Service
- **Domain**: generates CSV, PDF, Excel exports, shareable insight links.
- **Endpoints**:
  - `POST /api/reports` -> request report generation (returns job id).
  - `GET /api/reports/:jobId` -> poll status and signed download URLs.
  - `POST /api/reports/share` -> create time-bound share link.
- **Events**: `report.ready` triggers Notification service; audit logs stored for compliance.

### 5.12 Settings and Admin Service
- **Domain**: feature flags, organization-wide settings, analytics snapshots for internal teams.
- **Endpoints**:
  - `GET /api/admin/feature-flags` and `PUT /api/admin/feature-flags` -> manage rollout.
  - `GET /api/admin/metrics` -> aggregated KPIs for operations board.
  - `POST /api/admin/content-tips` -> manage contextual tips displayed in the UI.
- **Security**: admin-only routes with RBAC, IP allowlisting, and full auditing.

## 6. Cross-Cutting Concerns
- **Validation**: all inbound payloads validated with Zod schemas shared between frontend (for forms) and gateway (for enforcement). Services rely on DTOs to decouple from transport specifics.
- **Error Handling**: consistent error envelope (`{ code, message, details, correlationId }`) surfaced by the gateway. Services emit structured errors mapped to HTTP status ranges; fallback responses described in the PDF (for example chatbot fallback guidance) are implemented here.
- **Observability**: trace IDs flow via headers (`traceparent`). Centralized logging pipeline attaches `userId` or `sessionId` when available. Dashboards visualize SLA targets defined in the PDF (page 7 metrics).
- **Security and Compliance**: end-to-end HTTPS, secure cookies, CSRF protection for non-GET routes, content security policy per Next.js best practices, vulnerability scanning baked into CI/CD, retention and purge jobs per GDPR commitments.
- **Environment Management**: `.env.local`, `.env.staging`, `.env.production` managed via Doppler or Vault CLI locally; AWS Secrets Manager injection in cloud. CI ensures required variables exist before deploy.

## 7. Next Steps
1. Produce detailed ERD and Prisma schema that mirrors the entity list in the proposal (users, roles, accounts, transactions, budgets, goals, bills, reminders, notifications, AI sessions).
2. Flesh out async contract catalog (event names, payload schemas) and document them alongside REST specs.
3. Scaffold repository structure: `apps/web` (Next.js), `apps/api-gateway`, `services/*` microservices, `packages/*` shared libs (types, UI, config). Configure build tooling (ESLint, Prettier, lint-staged, Husky) per backlog.
