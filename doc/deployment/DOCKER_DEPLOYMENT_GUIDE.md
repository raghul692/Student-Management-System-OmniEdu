# OmniEdu — Production Docker Deployment Guide

## 1. Overview
OmniEdu provides enterprise-grade containerization with multi-stage Docker builds, non-root user execution, lightweight alpine images, and production orchestration via Docker Compose.

## 2. Container Architecture
- **`omniedu-server`**: Multi-stage Node.js 20 Alpine image. Runs TypeScript build, produces compiled `dist/`, executes with minimal production dependencies as non-root user `nodejs` (UID 1001).
- **`omniedu-client`**: Multi-stage build with Vite compiling static assets, hosted via high-performance Nginx Alpine proxy with gzip compression and cache headers.
- **`omniedu-db`**: PostgreSQL 16 Alpine container with persistent volume mounts, healthchecks, and tuned connection limits.

## 3. Production Environment Variables
Before launching, create `.env.production` from `.env.production.template`:
```bash
cp .env.production.template .env.production
```
Configure:
- `POSTGRES_USER`: Database superuser
- `POSTGRES_PASSWORD`: High-entropy password (min 16 chars)
- `POSTGRES_DB`: `omniedu_db`
- `DATABASE_URL`: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public`
- `JWT_SECRET`: Random 256-bit string
- `JWT_REFRESH_SECRET`: Separate random 256-bit string
- `CLIENT_ORIGIN`: Canonical HTTPS domain (e.g. `https://erp.omniedu.com`)

## 4. Launching the Production Stack
```bash
# Build and run the entire stack in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify container health and logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

## 5. Running Database Migrations & Production Seeding
```bash
# Execute Prisma database push/migrate inside the running API container
docker compose -f docker-compose.prod.yml exec api npx prisma db push

# Execute idempotent production seed
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.production.ts
```

## 6. Zero-Downtime Rolling Restarts
To perform seamless application updates without downtime:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps --build api
```
