# OmniEdu — CI/CD Pipeline & Release Workflow

## 1. Pipeline Overview
OmniEdu utilizes GitHub Actions (`.github/workflows/ci.yml`) to enforce code quality, strict typing, security vulnerability audits, automated test suites, and Docker image validation on every push and pull request.

```mermaid
graph TD
    Push[Git Push / PR to main/develop] --> Trigger[GitHub Actions Workflow]
    Trigger --> ServerJob[Job: Server CI]
    Trigger --> ClientJob[Job: Client CI]
    Trigger --> SecurityJob[Job: Security Audit]

    ServerJob --> S1[Checkout Code & Node 20 Setup]
    S1 --> S2[Start PostgreSQL 16 Service Container]
    S2 --> S3[npm ci & Prisma Client Generate]
    S3 --> S4[tsc --noEmit Typecheck]
    S4 --> S5[npx vitest run --fileParallelism=false (150 Tests)]

    ClientJob --> C1[Checkout Code & Node 20 Setup]
    C1 --> C2[npm ci]
    C2 --> C3[tsc --noEmit Typecheck]
    C3 --> C4[Vite Production Build & Chunk Size Validation]

    SecurityJob --> Sec1[Audit Dependencies via npm audit]
    Sec1 --> Sec2[SAST Static Scan]

    ServerJob --> Gate{Release Gate Verification}
    ClientJob --> Gate
    SecurityJob --> Gate
    Gate -->|All Pass| Artifact[Publish Docker Images / Staging Release]
```

## 2. Server Pipeline Steps
1. **Service Container**: Runs PostgreSQL 16 Alpine on port 5432 with health check probe.
2. **Dependency Cache**: Caches `~/.npm` to reduce build times.
3. **Prisma Generation**: Executes `prisma generate` to compile types.
4. **Strict Typecheck**: Runs `tsc --noEmit` on the server source code.
5. **Database Setup**: Applies `prisma db push` to the test database.
6. **Seed Execution**: Runs `tsx prisma/seed.ts` to establish the baseline test fixtures.
7. **Full Test Execution**: Runs `vitest run --fileParallelism=false` validating all 150 unit, integration, RBAC, tenant isolation, and security penetration test cases.

## 3. Client Pipeline Steps
1. **Dependency Installation**: Runs `npm ci` cleanly against `package-lock.json`.
2. **Frontend Typecheck**: Executes `tsc --noEmit` across all React components, views, and stores.
3. **Vite Production Build**: Compiles bundle to verify code-splitting, tree-shaking, and that chunk budgets remain within thresholds.

## 4. Branch Protection Rules
For production stability:
- `main` branch requires passing status checks for all jobs.
- Direct pushes to `main` are disabled; changes must arrive via reviewed pull requests.
