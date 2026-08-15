# Kate's workflow — phased journey through Social MCP

Kate's "screen" in phase 1 is the MCP client conversation; the design implications below
therefore bind the **tool catalog** (names, parameters, result/error copy) first, and
the future dashboard second.

---

## Phase 1 — Connect

- **Doing:** one-time setup — create the self-owned Meta app in Development Mode,
  generate the long-lived token, put it in `.env.local`, register the MCP server (stdio)
  in her MCP client.
- **Surface:** `.env.local` + MCP client config; a connection-check tool call.
- **Success:** a tool call confirms which Page and linked Instagram account the token
  resolves to.
- **Failure:** invalid/expired token, missing permission, no linked Instagram account —
  each must be distinguishable from the error copy alone.
- **Design implication:** the catalog needs a diagnostic tool that answers "what am I
  connected to and what can I do?" in one call. Error copy is technical (Kate reads
  tokens and permission names) but must always name the fix, not just the failure.

## Phase 2 — Compose & publish

- **Doing:** drafting a post or Reel in conversation with her agent, then publishing to
  the Page, the linked Instagram account, or cross-posting to both.
- **Surface:** publish tools (post, Reel, cross-post).
- **Success:** content is live; the tool result returns the published item's identity
  and permalink so she can verify with one click.
- **Failure:** platform rejection (media format, permission, rate limit) — surfaced with
  the platform's reason, never swallowed.
- **Design implication:** publishing is irreversible-ish and public — tool descriptions
  must make destination (Page vs linked Instagram account vs cross-post) explicit and
  unambiguous, so the agent never publishes to the wrong surface by default. This phase
  is the load-bearing UX of the entire product.

## Phase 3 — Schedule

- **Doing:** batching content ahead of time — setting future publish times, reviewing
  what's scheduled, rescheduling or canceling.
- **Surface:** schedule tools (create, list, reschedule, cancel).
- **Success:** she can see the full scheduled-post queue at any moment and trust it will
  fire without her.
- **Failure:** a scheduled post silently not publishing — the worst failure in the
  product; state must be inspectable after the fact.
- **Design implication:** list-scheduled must be first-class, not an afterthought;
  results carry publish time, destination, and status. (Future dashboard: this queue is
  the review surface's core.)

## Phase 4 — Engage

- **Doing:** reading new comments across recent posts, replying, moderating.
- **Surface:** comment tools (list, reply, moderate).
- **Success:** she clears comment backlog from the conversation — read, reply, move on —
  without opening Meta's UI.
- **Failure:** missing comments (partial listing) or replying to the wrong thread.
- **Design implication:** comment listings must anchor every comment to its post and
  thread position; reply tools take explicit comment identity, never "the last one".

## Phase 5 — Review performance

- **Doing:** reading Insights — how a post/Reel performed, how the Page is trending —
  and deciding what to make next.
- **Surface:** Insights tools (per-post, per-Page over a period).
- **Success:** an answer to "what worked?" grounded in the actual metrics, comparable
  across posts.
- **Failure:** vanity summaries that hide which metric moved, or metrics the API doesn't
  actually provide.
- **Design implication:** Insights tools return the platform's real metric names and
  values — no invented composite scores. Comparison across posts is a first-class
  parameter, since "which did better" is the actual question.

---

Phase order is the workflow: Connect gates everything; Compose & publish is the
load-bearing phase; Schedule, Engage, and Review cycle continuously after it. A design
that lets a later phase run without Connect's output (a resolved Page + token) is wrong.
