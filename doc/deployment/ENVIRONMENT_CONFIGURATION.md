# OMNIEDU — PRODUCTION ENVIRONMENT CONFIGURATION

## 1. Environment Tiers

OmniEdu supports 4 distinct execution environments configured via `NODE_ENV`:

| Tier | Purpose | Validation Behavior |
|---|---|---|
| `development` | Local engineering & prototyping | Permissive fallbacks, local SQLite/PostgreSQL, pretty logs |
| `test` | Automated Vitest & CI execution | Fast in-memory execution, non-blocking shutdown |
| `staging` | Pre-production validation | Strict secrets, real database & Redis, simulated traffic |
| `production` | High-availability customer traffic | **Strict Fail-Fast Assertions**: Zero default secrets allowed |

---

## 2. Environment Variable Reference

### Core Application
- `NODE_ENV`: `development` | `test` | `staging` | `production` (Default: `development`)
- `PORT`: Integer port for HTTP server (Default: `5000`)
- `CORS_ORIGIN`: Comma-separated list of allowed origins. **Wildcards (`*`) are prohibited in production.**

### Database (PostgreSQL)
- `DATABASE_URL`: Standard PostgreSQL connection URI. Must include connection pool tuning in production (`connection_limit=20&pool_timeout=15`).
- `DB_POOL_MIN`: Minimum idle database connections (Default: `2`).
- `DB_POOL_MAX`: Maximum active database connections (Default: `20`).
- `DB_TIMEOUT_MS`: Query timeout limit in milliseconds (Default: `15000`).

### Authentication & Secrets
- `JWT_ACCESS_SECRET`: High-entropy string (min 32 characters). **Fails fast if containing `dev_access_secret` in production.**
- `JWT_REFRESH_SECRET`: High-entropy string (min 32 characters). **Fails fast if containing `dev_refresh_secret` in production.**
- `JWT_ACCESS_EXPIRES_IN`: Access token expiration (Default: `15m`).
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (Default: `7d`).
- `HALL_TICKET_SECRET`: Cryptographic secret for signing tamper-proof exam QR codes.
- `STORAGE_SIGNING_SECRET`: Secret for HMAC signed pre-signed upload URLs.

### Redis & Caching
- `REDIS_URL`: Redis URI (e.g. `redis://:auth@redis:6379/0`). If omitted, degrades to bounded in-memory LRU cache.

### Observability & Telemetry
- `LOG_LEVEL`: `debug` | `info` | `warn` | `error` (Default: `info` in production).
- `ENABLE_METRICS`: Boolean flag enabling Prometheus metrics (Default: `true`).
- `ENABLE_TRACING`: Boolean flag enabling in-process distributed span tracking (Default: `true`).

### AI Platform
- `AI_PROVIDER`: `gemini` | `openai` | `local` (Default: `gemini`).
- `AI_MODEL`: Model identifier (Default: `gemini-2.5-flash`).
- `GEMINI_API_KEY`: API key for Google AI Studio / Gemini API.
- `AI_MAX_TOKENS_PER_ORG`: Token quota cap per billing cycle (Default: `500000`).
