# Deploying Social MCP to Fly.io + Neon — Operations Manual

Deployment target decided by the operator (2026-08-14): **Fly.io** for compute, **Neon** Postgres for data. Pattern carried over from the listo toolkit's production setup; app-specific values below are `TBD` until the first deploy.

Any task touching deploys, the live URL, or env/secrets reads this doc first.

---

## 1. What & where

| Thing | Value |
|---|---|
| Fly app | `TBD` (create with `flyctl launch --no-deploy` or `flyctl apps create`) |
| Live URL | `https://<app>.fly.dev` |
| Region | `TBD` — co-locate with the Neon project's region |
| VM | `shared-cpu-1x`, 1 GB, **scale-to-zero** (`min_machines_running = 0`) |
| Postgres | **Neon** free tier (0.5 GB) |
| Custom domain | `TBD` (Fly native certs — see §7) |

**Architecture (planned):** one container per app. The MCP server (`apps/mcp`) deploys as its own Fly app. If/when the `apps/web` dashboard exists, follow the combined-container pattern: the Next.js standalone app is the sole public listener and reverse-proxies `/api/*` to the internal Express API on `127.0.0.1` — same-origin ⇒ first-party cookies.

**Note for the MCP server:** if it speaks stdio only, it runs locally with the MCP client and needs no deploy at all. Fly hosting applies when it exposes a remote transport (Streamable HTTP/SSE) or runs scheduled jobs (e.g. posting queued reels). Decide transport before creating the Fly app.

---

## 2. Cost model (Fly bills per running second)

Fly has **no free tier** and **no fixed plan** — pure usage billing (card required). With scale-to-zero:

| State | Cost |
|---|---|
| Idle (machine stopped) | rootfs storage only, **~$0.15–0.50/mo** |
| 1 GB machine, full month always-on | ~$6/mo (do NOT run always-on without a reason) |
| Bandwidth | $0.02/GB (pennies at this scale) |
| Neon Postgres (free 0.5 GB) | $0 |
| Shared IPv4 + custom domain | $0 |

Net at zero/low usage: **~$0–2/mo.** First request after idle waits ~1–3 s (cold start); no dropped requests. **Caveat for this product:** a scheduler that must fire at exact times (queued reel publishing) can't rely on a stopped machine — use Fly Machines' scheduled wake, an external cron hitting an HTTP endpoint (which wakes the machine), or accept always-on cost for that app.

---

## 3. Prerequisites

- **flyctl** on `PATH` (installs to `~/.fly/bin`). Auth is interactive: run `flyctl auth login` yourself in a real terminal (needs a TTY — it will not run through a headless/agent shell).
- **pnpm / Node 22** for migrations.
- **Neon**: a project; use its **direct** (non-pooler) connection string.

---

## 4. Database — Neon (direct connection only)

Use the **direct** host (pooling OFF) for both migrations and the runtime app. Neon's `-pooler` host is a transaction-mode PgBouncer and does not support the prepared statements / DDL locks migrations need (the app is a persistent Node server with its own `pg` pool).

- Pooler (do NOT use): `ep-xxx-pooler.<region>.aws.neon.tech`
- Direct (use this): `ep-xxx.<region>.aws.neon.tech`
- Append `?sslmode=require`. Drop `channel_binding=require`.

Run migrations before the first deploy (the container does NOT auto-migrate; only local PGlite does):

```bash
export DATABASE_URL='postgresql://USER:PASS@ep-xxx.<region>.aws.neon.tech/neondb?sslmode=require'
pnpm --filter <api-app> db:migrate
```

---

## 5. Secrets (runtime, set on Fly)

Staged with `flyctl secrets set --stage --app <app> ...`, applied on the next deploy. Rotate one live secret without a rebuild: `flyctl secrets set --app <app> KEY=val` (rolling restart).

Expected set for this product (extend as built):

| Key | Value / source |
|---|---|
| `DATABASE_URL` | Neon **direct** string (§4) |
| `PUBLIC_URL` | canonical public origin, e.g. `https://<app>.fly.dev` — the OAuth issuer, redirect URIs, and token audience are all derived from it |
| `HOST` | `0.0.0.0` — the app defaults to `127.0.0.1`, which is unreachable from outside the VM |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes base64, `openssl rand -base64 32` — encrypts stored Meta tokens at rest; unset means a per-process key and stored credentials die on restart |
| `FB_APP_ID` / `FB_APP_SECRET` | Meta developer app credentials (Facebook Login) |
| `META_ACCESS_TOKEN` | long-lived Page/IG access token (rotate per Meta expiry policy) |
| `MCP_AUTH_TOKEN` | random, `openssl rand -base64 32` — bearer for the remote MCP transport |
| `CRON_SECRET` | random — bearer for any `/cron/*` endpoints |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | only if/when the `apps/web` dashboard ships |

`NODE_ENV=production` and ports are baked into the image / entrypoint — not secrets. **Never** echo secret values into logs, specs, or chat; `.env.local` holds local copies (gitignored).

---

## 6. Deploy / redeploy

`fly.toml` (repo root, created at first launch) pins the app name, `[build] dockerfile`, the 1 GB VM, and scale-to-zero. From the repo root:

```bash
export PATH="$HOME/.fly/bin:$PATH"
flyctl deploy --remote-only --app <app>
```

`--remote-only` builds on Fly's builder (no local Docker daemon). First build ~5–8 min; redeploys faster. Build context is the repo root (Dockerfile does `COPY . .`, honoring `.dockerignore`). The Dockerfile is authored when `apps/mcp` is scaffolded — pattern reference: multi-stage pnpm monorepo build (`pnpm fetch` → `pnpm --filter <app> build` → slim runtime stage).

---

## 7. Custom domain (Fly native certs)

```bash
flyctl certs add <domain> --app <app>
flyctl certs check <domain> --app <app>   # watch validation
```

DNS at the registrar/Cloudflare: `CNAME → <app>.fly.dev`, **DNS-only (grey cloud)** so Fly serves its own cert. Once verified, swap any base-URL secrets to the domain and redeploy.

---

## 8. Verify

```bash
B=https://<app>.fly.dev
curl -s "$B/health"                                   # {"status":"ok"} — every app exposes /health
curl -s -o /dev/null -w '%{http_code}\n' "$B/"        # 200
```

Logs & state: `flyctl logs --app <app>`, `flyctl status --app <app>`, `flyctl machine list --app <app>`.

---

## 9. Manage

```bash
flyctl status --app <app>
flyctl machine list --app <app>
flyctl secrets list --app <app>
flyctl scale show --app <app>
flyctl apps destroy <app>        # PERMANENT — operator authorization required
```

Neon (data) and Fly (compute) are independent — an outage or teardown of one does not take the other with it.
