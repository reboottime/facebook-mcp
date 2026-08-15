# Social MCP

MCP (Model Context Protocol) server for managing the operator's Facebook account, Facebook Reels, and Instagram — plus an optional web dashboard for review surfaces.

Scaffolded 2026-08-14 from the listo process toolkit: same orchestration harness (`.claude/` agents, hooks, workflows, skills) and same tech stack (Turborepo + pnpm, TypeScript, React 19 / Next.js, Tailwind v4, Express 5 + Drizzle, `@repo/ui` design system).

## Layout

- `apps/` — applications (planned: `apps/mcp` MCP server; optional `apps/web` dashboard)
- `packages/ui` — shared design system (`@repo/ui`)
- `packages/libs` — shared utilities (`@repo/libs`)
- `docs/` — canonical record (product, conventions, testing, tech stack)
- `.intermediate/` — gitignored workspace for exploratory artifacts
- `.state/state.md` — current lifecycle phase; read before starting work
- `.claude/` — orchestration harness: agents, commands, hooks, skills, workflows

## Getting started

```sh
pnpm install
pnpm dev
```

Start with `CLAUDE.md` and `.state/state.md`.
