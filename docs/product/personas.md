# Personas — Social MCP

Lean by design: phase 1 has exactly one real user. The secondary persona exists as a
phase-2 sanity gate, not a phase-1 design target.

---

## Primary — Kate, the operator (phase 1)

- **What** — the operator of this repo, and the product's only phase-1 user. Manages her
  own Facebook Page(s) and linked Instagram account. Runs the MCP server locally (stdio)
  beside her MCP client; owns the Meta app (Development Mode), the long-lived token in
  `.env.local`, and the server process. Technical: comfortable with env vars, tokens,
  and reading a stack trace when something breaks.
- **Where she lives** — the MCP client conversation (Claude / Claude Code / Hermes).
  Tool names, parameters, and result/error copy are her entire UI.
- **When** — ad hoc, conversation-driven: composing and publishing when she has content,
  checking comments and Insights when curiosity or a notification triggers it, batching
  scheduled posts ahead of busy weeks. No fixed daypart, no team cadence.
- **Why** — leverage: everything she can do on her Page via the Meta UI should be one
  tool call away in her MCP client, so the AI agent can do the mechanical work
  (formatting, cross-posting, scheduling, summarizing comments and Insights) while she
  keeps editorial judgment.
- **In scope** — the full tool catalog: publish/schedule posts and Reels, cross-post,
  manage comments, read Insights; token/connection diagnostics that speak her (technical)
  language.
- **Out of scope** — multi-user anything (registration, OAuth flows, page selection UX);
  approval chains; personal-profile automation (Meta platform forbids it).

## Secondary — Priya, the Page owner (phase 2) — sanity gate

- **What** — an external user once the Meta app is in Live Mode. Runs a small business
  or creator presence; admins her own Facebook Page with a linked Instagram account.
  Uses an MCP client but is **not** a platform engineer.
- **When** — signs up once (Register → Connect → Verify → Select page, per the phase-2
  state machine in [`product.md`](product.md)), then manages her Page conversationally
  like Kate does.
- **Why** — same leverage as Kate, without owning any infrastructure: no Meta app, no
  token handling, no server process.
- **In scope** — Facebook Login sign-up, MCP OAuth consent, page selection from her
  `/me/accounts` list, the same managed-Page tool catalog.
- **Out of scope** — anything requiring Meta platform internals. **Sanity gate: a design
  that requires Priya to understand Graph API mechanics, token types, Development vs
  Live Mode, or App Review is wrong.** She never sees a raw token or a raw Graph API
  error code.

## Tertiary — N/A

N/A — no third user type in phase 1 or 2. The template's customer/billing-owner slot has
no referent: the Page's audience (people who see posts and leave comments) are not
product users, and no separate finance/billing admin exists. Section retained per the
template rule (structure is the discipline).

---

## Persona anti-patterns — misreads to guard against

- **Kate as agency social-media manager.** She manages her *own* Page, not clients'
  Pages. No multi-tenant switching, client approval chains, or team roles in phase 1.
  Implication: phase-1 tools assume one authenticated Page context; no `client_id`-style
  parameters.
- **Kate as dashboard user.** Phase 1 has no visual surface. A design that routes a
  routine job (publish, schedule, reply, read Insights) through a web page instead of a
  tool call misreads where she lives. The dashboard, when it comes, is a *review* surface.
- **Priya as mini-Kate.** Porting Kate's setup ergonomics (env vars, tokens, local
  process) into phase-2 onboarding fails the sanity gate. Priya's path is browser
  consent screens and a page picker — nothing else.
- **The audience as a user.** Comment authors and post viewers are data the tools
  surface, never actors the product designs flows for.
