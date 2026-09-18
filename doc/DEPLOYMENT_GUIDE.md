# 🚀 OmniEdu Production Cloud Deployment Runbook
## 100% Free-Tier Architecture ($0.00 / month)

This guide provides end-to-end instructions for deploying the **OmniEdu Unified Student Management System** to production using zero-cost cloud services while maintaining enterprise-grade security and sub-200ms latency.

---

## 🏗️ Target Cloud Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Edge CDN                         │
│   Frontend SPA (React 19 + Vite + Tailwind CSS + Lucide Icons)  │
│   URL: https://omniedu.vercel.app                               │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Render Web Service (Free)                   │
│   Backend Node.js 20 LTS + Express + Prisma ORM                 │
│   URL: https://omniedu-api.onrender.com                         │
│   🛡️ Keep-Alive Defense: GitHub Actions Cron every 14 min      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Port 6543 (PgBouncer Pool)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               Supabase / Neon Serverless PostgreSQL             │
│   Free Tier: 500MB Storage, Automated Point-in-Time Recovery    │
│   Port 6543 (Pooled) / Port 5432 (Direct Migration URL)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Step 1: Cloud Database Provisioning (Supabase or Neon)

1. Sign up at [supabase.com](https://supabase.com) or [neon.tech](https://neon.tech) (Free tier).
2. Create a new project: `omniedu-production`.
3. In Project Settings > Database:
   * Copy the **Connection String (Transaction Pooler - Port 6543)** -> This is your `DATABASE_URL`.
   * Copy the **Connection String (Direct - Port 5432)** -> This is your `DIRECT_URL`.

---

## ⚙️ Step 2: Backend Cloud Deployment (Render.com)

1. Sign up at [render.com](https://render.com) and click **New + > Web Service**.
2. Connect your GitHub repository: `Student-Management-System-Project`.
3. Configure the service settings:
   * **Name**: `omniedu-api`
   * **Region**: `Oregon (US West)` or `Frankfurt (EU Central)`
   * **Runtime**: `Node`
   * **Instance Type**: `Free (512 MB RAM, 0.1 CPU)`
   * **Build Command**:
     ```bash
     npm install && npx prisma generate --schema=server/prisma/schema.prisma && npx prisma migrate deploy --schema=server/prisma/schema.prisma && npm run build --workspace=server
     ```
   * **Start Command**:
     ```bash
     node server/dist/server.js
     ```
4. Add the following **Environment Variables**:
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
   * `DATABASE_URL`: `<Your-Supabase-Pooled-Connection-String>`
   * `DIRECT_URL`: `<Your-Supabase-Direct-Connection-String>`
   * `JWT_ACCESS_SECRET`: `<Generate-Secure-64-Byte-Hex-String>`
   * `CORS_ORIGIN`: `https://omniedu.vercel.app`
5. Click **Create Web Service**. Render will build and deploy the container.
6. Once deployed, note your live backend URL (e.g. `https://omniedu-api.onrender.com`).

---

## 🌐 Step 3: Frontend Deployment (Vercel)

1. Sign up at [vercel.com](https://vercel.com) and click **Add New... > Project**.
2. Import your GitHub repository.
3. In Project Configuration:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click `Edit` and select `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   * `VITE_API_URL`: `https://omniedu-api.onrender.com/api`
5. Click **Deploy**.
6. Once deployed, Vercel provides an instant global HTTPS domain (e.g. `https://omniedu.vercel.app`).
7. Update `CORS_ORIGIN` in Render to match your exact Vercel domain.

---

## 🛡️ Step 4: Render 14-Minute Sleep Defense Setup

Render free web services sleep after 15 minutes of inactivity. OmniEdu includes built-in sleep defense:

### Option A: GitHub Actions Keep-Alive (Zero Configuration)
The repository includes `.github/workflows/keepalive.yml` configured to ping `/api/health/live` every 14 minutes.
1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Add a repository secret:
   * Name: `RENDER_API_URL`
   * Value: `https://omniedu-api.onrender.com`
3. GitHub Actions will automatically keep your Render instance warm 24/7.

### Option B: UptimeRobot (Free Alternative)
1. Sign up for free at [uptimerobot.com](https://uptimerobot.com).
2. Create an **HTTP(s) Monitor**:
   * URL: `https://omniedu-api.onrender.com/api/health/live`
   * Monitoring Interval: `10 minutes`
3. This guarantees the server never idles to sleep.

---

## 🧪 Step 5: Post-Deployment Verification Runbook

Run these checks to verify the live production cluster:

| Verification Target | Command / Probe | Expected Outcome |
| :--- | :--- | :--- |
| **Backend Health** | `curl -f https://omniedu-api.onrender.com/api/health/live` | HTTP 200 `{"status":"alive","service":"OmniEdu Core API"}` |
| **Database Readiness** | `curl -f https://omniedu-api.onrender.com/api/health/ready` | HTTP 200 `{"status":"ready","database":"connected"}` |
| **Frontend Root** | Open `https://omniedu.vercel.app` in Chrome | Instant render of OmniEdu shell in Midnight Obsidian mode |
| **Guest Sandbox** | Click "Try College Demo" | Zero database mutations, $<5\text{ms}$ in-memory reactivity |
| **Live PDF Engine** | Click "Download Marksheet (PDF)" | Client-side jsPDF downloads without server network request |
| **Offline Sync** | Toggle Network Offline -> Mark Attendance -> Reconnect | Auto-sync flush with green telemetry badge |

---

## 💰 Total Cost Analysis

| Component | Provider & Tier | Cost |
| :--- | :--- | :--- |
| Frontend Hosting | Vercel Hobby (100 GB Bandwidth, Unlimited Edge Deployments) | **$0.00 / month** |
| Backend API | Render Free (512 MB RAM, 0.1 CPU, Custom Domain, HTTPS) | **$0.00 / month** |
| PostgreSQL DB | Supabase Free (500 MB Storage, 50,000 Monthly Active Users) | **$0.00 / month** |
| Sleep Defense | GitHub Actions (2,000 Free CI/CD minutes/month) | **$0.00 / month** |
| **Total Monthly Cost** | | **$0.00 / month (100% Free)** |
