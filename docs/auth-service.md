# Auth Service

## Overview
The authentication microservice is implemented in `services/auth`. It exposes REST endpoints for signup, login, session refresh, logout, password resets, and email verification as outlined in `docs/api-contracts.md`.

## Quick start
1. Copy the sample environment file: `cp services/auth/.env.example services/auth/.env`
2. Update secrets (JWT access/refresh secrets, database URL) before running locally.
3. Generate the Prisma client after editing the schema: `npx prisma generate --schema services/auth/prisma/schema.prisma`
4. Start the service: `npm run auth:dev`
5. Run the focused tests: `npm run auth:test`

## Architecture highlights
- Fastify + Zod for HTTP handling and validation
- Prisma schema in `services/auth/prisma/schema.prisma` with a generated migration script
- Argon2 for credential and refresh token hashing
- JSON Web Tokens for access sessions; opaque refresh tokens persisted in PostgreSQL
- Vitest suite with an in-memory repository stub to exercise core flows

## Environment notes
The service expects a PostgreSQL DATABASE_URL plus JWT_ACCESS_SECRET and JWT_REFRESH_SECRET. The example file (services/auth/.env.example) documents the required keys. Tests rely on the in-memory repository and do not hit the database, but the runtime service requires a reachable Postgres instance.
