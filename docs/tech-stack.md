# Technology Decisions

This document finalizes the technology selections referenced in the Finance Manager Dashboard proposal and architecture overview. Each decision is mapped to backlog Task: "Finalize technology choices" and validates compatibility with the CS490 Starter 26 requirements.

## Frontend Experience
- **Component System**: shadcn/ui built on Radix UI primitives to deliver accessible, headless components while retaining control over theming. Components are wrapped with project-specific styling tokens in `src/components/ui`.
- **Styling & Theming**: Tailwind CSS with CSS variables for design tokens (`--color-primary`, `--radius-lg`, etc.) enabling light/dark palettes. Tailwind is extended via `tailwind.config.ts` to host both theme schemes and a design scale matching the PDF mockups.
- **Charting & Data Viz**: Recharts for dashboard charts (spending trends, budget variance). Complemented by `nivo` for more advanced visualizations (goal tracking radial charts) where interactivity is required. Both libraries integrate with SSR and responsive containers.

## Identity & Access
- **Auth Provider**: Internal Auth service powered by Node.js + Fastify with Prisma (per architecture). For external identity federation we layer OAuth 2.0/OIDC via Auth0 to accelerate enterprise SSO. Gateway handles token exchange and issues HTTP-only session cookies.
- **2FA & Secrets**: TOTP delivered through `otplib` with backup codes stored hashed in PostgreSQL. Secrets are sourced from AWS Secrets Manager across services.

## Backend Services
- **Runtime**: Node.js 20 LTS with TypeScript, Fastify, and Zod validators for each microservice.
- **Background Jobs**: BullMQ running on Redis (Elasticache in AWS, RedisStack locally) for queues, delayed delivery, and recurring jobs.
- **API Composition**: Gateway remains Fastify-based with `@fastify/http-proxy` for selective pass-through and aggregated orchestrations.

## Communications & Notifications
- **Email**: Amazon SES for transactional emails (verification, statements). Local development falls back to `maildev` Docker container for inspection.
- **SMS & Voice**: Twilio Programmable Messaging for reminders and MFA codes; fallback to email when SMS is unavailable per compliance guidance.
- **Push/In-App**: Web push via `@web-push` with VAPID keys managed by the Notification service and persisted in PostgreSQL.

## AI & Insights
- **LLM Vendor**: Azure OpenAI (gpt-4o) for production due to enterprise compliance, with OpenAI API (gpt-4o-mini) enabled for local/staging environments. Prompt templates live in the AI Insight service and are versioned alongside code.
- **Embedding Search**: `text-embedding-3-large` served from Azure OpenAI for semantic recall in the AI assistant knowledge base stored in PostgreSQL + PgVector extension.

## Financial Integrations
- **Bank Linking**: Plaid Link for US institutions with fallback CSV upload pipeline handled by the Transactions service. Sandbox keys managed through environment config.
- **Payments & Transfers**: Stripe Treasury for ACH-based savings automation paired with Dwolla for accounts lacking Stripe coverage, abstracted via the Accounts service integration layer.

## Data & Storage
- **Primary Database**: Amazon Aurora PostgreSQL 15 with Prisma migrations. PgBouncer handles pooling, with one read replica dedicated to analytics workloads.
- **Caching & Sessions**: Redis (Elasticache) for caching, job queues, and short-lived session data. Session tokens remain cookie-based.
- **File/Object Storage**: Amazon S3 for report exports, statement documents, and Plaid asset reports. Lifecycle policies enforce retention from PDF requirements.

## Infrastructure & DevOps
- **Containerization**: Docker for all services with `docker-compose` orchestrating local stacks (Next.js, gateway, services, PostgreSQL, Redis, Maildev, Plaid sandbox mock).
- **Cloud Platform**: AWS (ECS Fargate + RDS + CloudFront + S3 + Secrets Manager) as the infrastructure backbone, consistent with architecture.md.
- **CI/CD**: GitHub Actions pipelines with reusable workflows for lint/test/build/deploy; Terraform manages AWS infrastructure as code.

## Observability & Analytics
- **Monitoring**: Prometheus scraping ECS tasks with Grafana dashboards for KPIs; CloudWatch metrics integrated for AWS-native signals.
- **Logging**: Structured JSON logs shipped via Fluent Bit to Amazon OpenSearch. OpenTelemetry traces captured with `@opentelemetry/sdk-node` exported to Grafana Tempo.
- **Product Analytics**: PostHog for user behavior tracking across web and services, fulfilling analytics obligations from the PDF.

## Compliance & Security Tooling
- **Static Analysis**: ESLint with security plugins (`eslint-plugin-security`, `eslint-plugin-jsx-a11y`); Snyk monitors dependencies.
- **Secrets Hygiene**: Pre-commit hook using `gitleaks` to prevent secret leaks.
- **Vulnerability Scanning**: Trivy for container image scanning in CI alongside Dependabot updates.
