# Deployment

Production deployment for the Compiler Visualizer — Spring Boot backend on Render, PostgreSQL on Supabase, frontend on Vercel.

## Architecture Overview

```
Browser (Vercel /compiler-visualizer-thant-zin.vercel.app)
       │
       ▼
Spring Boot API  (Render web service — Singapore, free tier)
       │   │
   ┌───┴───┴────────────┐
   ▼                   ▼
Supabase          Local filesystem
PostgreSQL        (ephemeral — no data storage)
(ap-southeast-1)  
```

## Infrastructure Details

| Piece | Host | Region | Notes |
|---|---|---|---|
| Frontend | Vercel (Hobby) | Edge | Static build, global CDN. Deep-link `/compiler` 404s — navigate in-app |
| Backend | Render (Free web) | Singapore (`sgp-1`) | Docker image, 512 MB RAM / 0.1 CPU, 750 hrs/mo quota |
| Database | Supabase Free | Singapore (`ap-southeast-1`) | 500 MB, pauses after 7 days inactivity |
| Region pairing | — | — | Backend and DB are both in Singapore → sub-10ms round-trips |

## Environment Variables (set in Render dashboard → compiler-visualizer-api)

| Variable | Example | Purpose |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Selects `application-prod.properties` |
| `DB_URL` | `jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require` | Supabase session-pooler connection |
| `DB_USERNAME` | `postgres.<project-ref>` | Pooler user |
| `DB_PASSWORD` | *(secret)* | Pooler password |
| `JWT_SECRET` | 48-byte base64 | HS256 signing key |
| `JWT_EXPIRATION` | `86400000` | 24 h token TTL |
| `APP_CORS_ALLOWED_ORIGINS` | `https://compiler-visualizer-thant-zin.vercel.app,http://localhost:5173` | CORS allow-list |
| `RENDER_URL` | `https://compiler-visualizer-api.onrender.com` | Used by the keep-alive GitHub Action |

> `application.properties` and `opencode.json` are **gitignored** and must not be committed (they hold secrets). Supply every production property via env vars.

## Free-Tier Constraints

- **512 MB RAM / 0.1 shared CPU** — enough for low traffic. Peak compile jobs (javac + JVM + javap) push ~250 MB; avoid many concurrent compiles (see Scaling).
- **15-min idle timeout** → cold starts (15–30 s JVM boot). A [keep-alive Action](.github/workflows/keep-alive.yml) pings `/api/health` every 10 min to stay warm, and keeps the Supabase free project from pausing after 7 days of inactivity.
- **750 instance-hours/month** — exactly one always-on free service. No room for extra services without upgrade.
- **No persistent disk** — the container's filesystem is ephemeral and wiped on redeploy. All durable data lives in Supabase; uploaded files are not persisted.
- **No custom domains on free plan** (only `*.onrender.com`).

## Scaling Guidance

| Concurrent compiles | Free tier | Starter ($7/mo) | Standard ($25/mo) |
|---|---|---|---|
| 1–10 users | ✅ OK (with keep-alive) | ✅ | ✅ |
| 10–50 users | ⚠️ OOM/cold starts | ✅ | ✅ |
| 50+ users | ❌ Upgrade required | ⚠️ | ✅ |

To handle heavier load, upgrade the Render plan (more RAM + dedicated CPU) and/or add a Redis cache for compiled results.

## Deployment Flow (first time)

1. Create the Supabase project (Singapore region) and run the schema migration:
   ```
   npx supabase db push     # or apply migrations via the Supabase MCP
   ```
2. Create the Render web service (Docker runtime, Singapore region, free plan) and add the env vars above.
3. Set `VITE_API_URL=https://compiler-visualizer-api.onrender.com/api` in Vercel → Project Settings → Environment Variables → **Redeploy**.
4. Add `RENDER_URL` as a GitHub Actions secret so the keep-alive workflow can ping the service.
5. Push to `main` — both Vercel and Render auto-deploy. Verify with:
   ```
   curl https://compiler-visualizer-api.onrender.com/api/health
   → {"status":"up","db":"up"}
   curl -X POST https://compiler-visualizer-api.onrender.com/api/compile \
        -H "Content-Type: application/json" \
        -d '{"sourceCode":"class Main{public static void main(String[]a){}}"}'
   ```
