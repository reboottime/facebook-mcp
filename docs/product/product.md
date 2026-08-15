# Product brief

**Social MCP** — an MCP (Model Context Protocol) server that lets a user manage their
Facebook Page, Facebook Reels, and Instagram through AI-agent tooling (Claude, Claude Code,
Hermes — any MCP client).

## Scope constraint (Meta platform reality)

The Meta Graph API does not permit automating a **personal profile** (profile publishing
APIs were removed in 2018). The automatable surface is **Facebook Pages** (posts, Reels,
comments, insights, scheduling) and **Instagram Business/Creator accounts** linked to a
Page. All tooling targets Pages, never personal timelines.

## Phase 1 — operator's own account (single user)

One admin user: the operator, managing their own Page(s) + linked Instagram. The MCP
server exposes tools — publish/schedule posts and reels, read insights, manage comments,
cross-post between Facebook and Instagram. Goal: everything the operator can do on their
Page via the UI is automatable via MCP tool calls.

- Runs locally (stdio transport) alongside the MCP client.
- Auth: operator's own long-lived token from a self-owned Meta app in **Development
  Mode** — no App Review required. Token lives in `.env.local`.

## Phase 2 — multi-user Facebook app

The Meta app graduates to Live Mode; other users sign in and use the same MCP server to
manage **their** Pages via their own MCP client.

User-facing state machine:

1. **Register** — user signs up, completes Facebook Login (OAuth) against our Meta app;
   we store their user token and the Pages they admin.
2. **Connect** — user adds the MCP server to Claude/Hermes (remote HTTP transport).
3. **Verify** — when the client first acts, MCP OAuth authorization confirms the user's
   identity (browser consent → per-user token).
4. **Select page** — server lists the user's Pages (`/me/accounts`); user picks the one
   to manage; selection persists for the account/session.
5. **Manage** — all tool calls run against the selected Page's token.

Phase 2 requirements: remote MCP transport with OAuth 2.1 authorization, per-user token
storage, and **Meta App Review + business verification** for Page-management permissions
(`pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`,
`instagram_content_publish`, …). App Review is the schedule long pole.

## Dashboard (optional, later)

A web dashboard may follow as a review surface — queue, analytics, approval — built on
the shared `@repo/ui` design system. In phase 2 it also carries registration/sign-in.

> Expanded 2026-08-14 from operator-stated vision. Derive the rest of `docs/product/`
> per the order in [`index.md`](index.md) before design work.
