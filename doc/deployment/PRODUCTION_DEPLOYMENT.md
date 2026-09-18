# OMNIEDU — PRODUCTION DEPLOYMENT ARCHITECTURE & RUNBOOK

## 1. High-Level Topology

```text
User / Student / Staff / Parent Browser
                    ↓
          CDN & Anycast Edge
                    ↓
       Nginx Reverse Proxy (Port 80 / 443)
                    ↓
          ┌─────────┴─────────┐
          │                   │
    Frontend SPA          API Backend (Node.js/Express)
    (/index.html)         (Port 5000)
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   PostgreSQL 16+       Redis 7+ (IOREDIS)    Object Storage
   (Primary + Pool)     (Cache + DLQ)         (Local / S3)
                              │
                      Background Workers
                      (Concurrency: 3, DLQ)
                              │
                    External AI Providers
                    (Gemini / OpenAI / Local Fallback)
```

---

## 2. Horizontal Scaling Readiness

1. **Stateless API Processes**:
   - All session authentication is driven by dual stateless JWT tokens (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
   - Process-local locks and mutable shared state have been completely eliminated.
   - Any number of `omniedu-api` container replicas can be spun up behind the reverse proxy or Kubernetes ingress controller.

2. **Distributed Rate Limiting & Caching**:
   - High-throughput rate limit counters and tenant caches are coordinated through Redis.
   - If Redis becomes temporarily unreachable, nodes automatically degrade to memory-bounded LRU caches with TTL eviction without throwing unhandled exceptions.

3. **Database Connection Pooling**:
   - Recommended production connection URL configuration:
     `postgresql://user:pass@host:5432/db?schema=public&connection_limit=20&pool_timeout=15`
   - Total database connections across N replicas must not exceed PostgreSQL `max_connections` (default 100).
   - In Kubernetes deployments with > 5 replicas, use **PgBouncer** or **AWS RDS Proxy** in transaction pooling mode.

---

## 3. Container Deployment (Docker Compose Production)

To deploy the full production stack:

```bash
# 1. Provide production environment variables
cp .env.example .env.production
# Populate real secrets: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD

# 2. Build and launch containers in detached mode
docker compose -f docker-compose.prod.yml up --build -d

# 3. Verify healthy status across all 4 containers
docker compose -f docker-compose.prod.yml ps
```

---

## 4. Rollback Protocol

If an issue is detected post-deployment:

1. **Revert Traffic Immediately**:
   ```bash
   # Point Nginx upstream back to the previous stable release tag:
   docker tag omniedu-api:previous omniedu-api:latest
   docker compose -f docker-compose.prod.yml restart server
   ```
2. **Database Schema Rollback**:
   - Zero-downtime expand-and-contract migrations ensure database backward compatibility.
   - If a rollback requires reverting table changes, refer to [DATABASE_MIGRATION_GUIDE.md](../operations/DATABASE_MIGRATION_GUIDE.md).
3. **Verify Rollback**:
   ```bash
   curl -f http://localhost:5000/health/ready
   ```
