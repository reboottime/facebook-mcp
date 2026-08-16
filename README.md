# Social MCP

MCP (Model Context Protocol) server for managing a **Facebook Page** and its linked
**Instagram Business account** via the Meta Graph API — publish and schedule posts and
Reels, cross-post between platforms, manage comments, and read insights. Pages only;
never personal profiles.

One TypeScript server ([`apps/mcp`](apps/mcp)) exposes the same 12-tool catalog over
two transports:

- **stdio** — single operator, authenticated by an env token (personal use).
- **Streamable HTTP + OAuth 2.1** — multi-user remote server with Facebook Login
  onboarding and encrypted per-user token storage (Drizzle; PGlite in dev, Neon in
  production).

Details: [`docs/architecture.md`](docs/architecture.md).

## Getting started

```sh
pnpm install
pnpm exec turbo run build --filter=mcp
pnpm --filter mcp verify:stdio   # offline round-trip of all 12 tools, no token needed
```

**To connect it to a real Meta app** — register your own app in dev mode, get a token,
hook up an MCP client, and (optionally) the go-live path for serving other users —
start with [`docs/setup.md`](docs/setup.md).

Add the server to Claude Code:

```sh
claude mcp add social-mcp -- node <repo>/apps/mcp/dist/index.js
```

## Layout

- `apps/mcp` — the MCP server: both transports, tools, Graph API client, Drizzle
  schemas, verify scripts
- `packages/ui`, `packages/libs` — shared design system (`@repo/ui`) and utilities
- `docs/` — setup guides, architecture, tech stack, conventions, testing,
  [`fly-deployment.md`](docs/fly-deployment.md)
- `.state/state.md` — current lifecycle phase; read before starting work
- `.claude/` — orchestration harness: agents, commands, hooks, skills, workflows

Stack: TypeScript (ESM), Turborepo + pnpm, `@modelcontextprotocol/sdk`, Drizzle ORM.
