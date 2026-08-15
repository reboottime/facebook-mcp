# Project State

Current lifecycle phase and active work. Read before starting work.
Live session registry is in [`in-flight-work.md`](in-flight-work.md); phase conventions in [`.claude/workflows/design-phases.md`](../.claude/workflows/design-phases.md).

## Current phase: **implementation** (MCP server shipped; product-design docs still undone)

`apps/mcp` — the MCP server — is built and merged to `main` across both phases in an
overnight run (2026-08-14 → 15). The design-phase doc derivation (`docs/product/*`,
`docs/design/*`) was **skipped** for the server per the operator's overnight scope: the
MCP server needs platform + terminology, not visual personality, and no dashboard was
built. Those docs remain to be derived if/when `apps/web` (the review dashboard) starts.

### Shipped

- **Phase 1** — `fd1a306`: stdio MCP server, 12-tool catalog (Facebook Pages + linked
  Instagram Business via Graph API v26.0), operator token from `apps/mcp/.env.local`.
  48 unit tests + stdio round-trip smoke. Zero-env boot verified.
- **Phase 2** — `0eae5fb`: Streamable HTTP transport + OAuth 2.1 authorization server
  (MCP spec 2026-07-28), Facebook Login onboarding, encrypted per-user Drizzle storage
  (PGlite fallback / Neon-ready), per-user page selection. 106 tests; full flow verified
  against a local fake Meta. Zero-env boot holds for both transports.
- Every merge gated on build + check-types + lint + test (4/4) and passed adversarial
  code review + security audit to a clean verdict.

Run record + decisions: `.intermediate/reports/overnight-2026-08-14.md`.
Operator setup checklist (Meta app, live tokens, App Review, Fly deploy):
`.intermediate/reports/operator-todo.md`.

### Not done (by design — needs operator's Meta account)

No live Meta call was made tonight (no app credentials exist). Standing up the real Meta
app, getting a dev token, and running both flows live is the operator's next step per the
operator-todo. App Review + business verification + Fly.io/Neon deploy follow.

## Active work

- None in flight. Both feature branches merged and deleted; tree clean on `main`.
