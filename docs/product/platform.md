# Platform overview — Social MCP

## What the product is

**Social MCP** is an MCP (Model Context Protocol) server that lets its user manage
Facebook Pages and linked Instagram accounts through AI-agent tooling. The user works
inside an MCP client — Claude, Claude Code, Hermes, any MCP client — and the server
exposes tools that publish and schedule posts and Reels, read Insights, manage comments,
and cross-post between a Facebook Page and its linked Instagram account via the Meta
Graph API.

The Meta platform constraint shapes everything: personal profiles cannot be automated
(profile publishing APIs were removed in 2018). The managed object is always a
**Facebook Page**, plus the **Instagram Business/Creator account linked to that Page**.
No tool, label, or error message ever implies a personal timeline is in scope.

Phase 1 is single-user: the operator (Kate) runs the server locally over stdio, next to
her MCP client, authenticated with her own long-lived token from a self-owned Meta app
in Development Mode. Phase 2 graduates the Meta app to Live Mode: external users sign in
with Facebook Login, connect over remote HTTP with MCP OAuth, select one of their Pages
from `/me/accounts`, and manage it with the same tool catalog. A web dashboard may
follow later as a review surface (queue, analytics, approval) — it is not part of the
phase-1 product.

## Surfaces

| Surface | Phase | What it carries |
| --- | --- | --- |
| **MCP server (tool catalog)** | 1 | The product itself. Local stdio process beside the MCP client. Every job — publish, schedule, cross-post, comments, Insights — is a tool call. |
| **MCP client conversation** | 1 | Where the user actually works. Tool names, parameters, and result/error copy are the entire phase-1 UX. |
| **`.env.local` config** | 1 | Long-lived token + Meta app credentials. Set once at connect time; never echoed by tools. |
| **MCP server (remote HTTP + OAuth)** | 2 | Same tool catalog, per-user tokens, page selection persisted per account/session. |
| **Web dashboard** | later | Optional review surface — queue, analytics, approval; carries registration/sign-in in phase 2. Built on `@repo/ui`. |

## Primitives — the domain's nouns

- **Page** — the managed Facebook Page. The root object every tool targets.
- **Linked Instagram account** — the Instagram Business/Creator account linked to the Page.
- **Post** — a feed publication on the Page or the linked Instagram account.
- **Reel** — a short-form video publication.
- **Scheduled post** — a post or Reel with a future publish time, not yet live.
- **Comment** — audience response on a post or Reel; a **reply** is a comment on a comment.
- **Insights** — Meta's performance metrics for a Page, post, or Reel.
- **Cross-post** — publishing the same content to both the Page and its linked Instagram account.
- **Tool** — one MCP tool in the catalog; the unit of capability.
- **Token** — the long-lived access token (phase 1: operator's own; phase 2: per-user).
- **Meta app** — the self-owned Facebook app the server authenticates through.

## Terminology — canonical terms and banned synonyms

Every tool name, parameter, error message, spec, and future UI label uses the canonical
term verbatim. Enforced by `product-domain-reviewer`, `frontend-reviewer`, and
`storybook-documenter`.

| Canonical term | Meaning | Banned synonyms |
| --- | --- | --- |
| **Page** | The managed Facebook Page — the root object | account, profile, timeline, fan page |
| **linked Instagram account** | Instagram Business/Creator account linked to the Page | IG, insta, Instagram profile, Instagram page |
| **post** | A feed publication | status, update, publication |
| **Reel** | A short-form video publication | short, clip, video post |
| **scheduled post** | Post/Reel with a future publish time | queued post, pending post, draft |
| **publish** (verb) | Make content live now | post (as verb), share, upload, push |
| **schedule** (verb) | Set a future publish time | queue, plan |
| **cross-post** (verb) | Publish to both Page and linked Instagram account | mirror, sync, duplicate |
| **comment** | Audience response on a post/Reel | response, message |
| **reply** | A comment on a comment | answer, respond (as noun) |
| **Insights** | Meta's performance metrics | analytics, stats, metrics |
| **tool** | One MCP tool in the catalog | command, action, endpoint, function |
| **MCP client** | Claude / Claude Code / Hermes / any MCP client | assistant, bot, chat app |
| **operator** | The phase-1 user (Kate) managing her own Page | admin, user (in phase-1 copy) |
| **Page owner** | A phase-2 external user managing their own Page | customer, tenant, client |
| **token** | Long-lived access token | API key, secret, credential |
| **Meta app** | The self-owned Facebook app the server authenticates through | Facebook app, FB app |
| **page selection** | Phase-2 choice of which Page to manage (`/me/accounts`) | workspace switch, account switch |

## User types (sketch — expanded in `personas.md`)

- **Operator (Kate)** — phase 1. One admin managing her own Page(s) + linked Instagram
  account through her MCP client. Owns the Meta app, the token, and the server process.
- **Page owner (Priya)** — phase 2. External user who signs in with Facebook Login and
  manages her own Page through her own MCP client. Never sees Meta platform internals.

> Top-level nav / IA is intentionally absent here — it emerges from wireframes/screens
> once the dashboard jobs are clear (see [`index.md`](index.md)).
