# Membership Management System

Production-grade foundation for a single-organization membership management system.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui-style reusable components
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Monorepo: npm workspaces
- Deployment target: Docker Compose on a VPS

## Project Structure

```text
membership-management-system/
  apps/
    web/
    api/
  packages/
    shared/
  docker-compose.yml
  README.md
```

## Local Setup

Copy environment examples:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Generate Prisma Client and run the first migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Start the API:

```bash
npm run dev -w apps/api
```

Start the web app in another terminal:

```bash
npm run dev -w apps/web
```

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health

## Docker Compose

Build and start the full stack:

```bash
docker compose up --build
```

Start only PostgreSQL:

```bash
docker compose up -d postgres
```

Stop services:

```bash
docker compose down
```

Remove local database volume:

```bash
docker compose down -v
```

## Verification Commands

```bash
npm run typecheck
npm run build
curl http://localhost:4000/api/health
```

Expected health response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-06-13T00:00:00.000Z",
  "service": "Membership Management System"
}
```

## Current Foundation

- Next.js app router with public, member, and admin route areas
- Tailwind CSS design system tokens and reusable `Button`/`Card` primitives
- NestJS module structure with health and members modules
- Prisma schema for organization settings, users, members, plans, memberships, and payments
- PostgreSQL Docker service with health checks
- API health endpoint verifies live database connectivity
- Shared package for constants and API/member types

## Auth Direction

Authentication is intentionally reserved for the next implementation phase. The data model already supports role-based users and member-linked accounts, and the API is structured for JWT access token plus refresh token modules.
