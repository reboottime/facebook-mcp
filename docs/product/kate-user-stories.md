# Kate — user stories

One story per concrete job, organized by workflow phase
([`kate-workflow.md`](kate-workflow.md)). For an MCP server the stories map ~1:1 to the
tool catalog — each story names the tool capability it implies and the data the result
must carry. Tool *names* are engineering's to finalize; capabilities and result data are
binding.

> Items marked **[verify]** need confirmation against Meta Graph API docs before tool
> specs are written — the brief does not establish them, and inventing API facts is
> forbidden.

---

## Phase 1 — Connect

- **S1 · Connection check.** As Kate, when I've set my token in `.env.local` (or
  anything starts failing), I want to call one diagnostic tool so that I know which
  Page and linked Instagram account I'm connected to and which permissions the token
  carries. — *Tool capability:* connection/identity check. *Result data:* Page name +
  id, linked Instagram account (or explicit "none linked"), granted permissions, token
  expiry **[verify: token debug/introspection endpoint shape]**.

## Phase 2 — Compose & publish

- **S2 · Publish a post.** As Kate, when my agent and I have finished a draft, I want to
  publish it to my Page so that it goes live without opening Meta's UI. — *Tool
  capability:* publish post to Page. *Result data:* post id + permalink.
- **S3 · Publish a Reel.** As Kate, when I have a finished short video, I want to
  publish it as a Reel to my Page so that it reaches the Reels surface. — *Tool
  capability:* publish Reel to Page. *Result data:* Reel id + permalink. **[verify:
  media upload flow — local file vs hosted URL]**
- **S4 · Publish to Instagram.** As Kate, when content belongs on Instagram, I want to
  publish a post or Reel to my linked Instagram account so that both presences stay
  active. — *Tool capability:* publish to linked Instagram account. *Result data:* media
  id + permalink.
- **S5 · Cross-post.** As Kate, when one piece of content fits both surfaces, I want to
  cross-post it to the Page and the linked Instagram account in one call so that I don't
  repeat myself. — *Tool capability:* cross-post. *Result data:* both published ids +
  permalinks, per-destination success/failure (partial failure must be explicit).

## Phase 3 — Schedule

- **S6 · Schedule a post or Reel.** As Kate, when I'm batching content ahead of a busy
  week, I want to schedule it with a future publish time so that it publishes without
  me. — *Tool capability:* schedule post/Reel. *Result data:* scheduled-post id, publish
  time, destination. **[verify: native Graph API scheduling for Page posts vs
  server-side scheduling for Reels/Instagram]**
- **S7 · List scheduled posts.** As Kate, when I want to know what's coming, I want to
  list all scheduled posts so that I can trust the queue. — *Tool capability:* list
  scheduled posts. *Result data:* per item — content summary, destination, publish time,
  status.
- **S8 · Reschedule or cancel.** As Kate, when plans change, I want to reschedule or
  cancel a scheduled post so that the queue matches reality. — *Tool capability:*
  reschedule/cancel by scheduled-post id. *Result data:* new state confirmation.

## Phase 4 — Engage

- **S9 · List comments.** As Kate, when I check in on a post, I want to list its
  comments (and new comments across recent posts) so that I can clear the backlog from
  the conversation. — *Tool capability:* list comments per post; recent-comments view.
  *Result data:* comment id, author name, text, timestamp, parent post, thread position.
- **S10 · Reply to a comment.** As Kate, when a comment deserves a response, I want to
  reply to that specific comment so that the thread stays coherent. — *Tool capability:*
  reply by comment id. *Result data:* reply id + parent linkage.
- **S11 · Moderate a comment.** As Kate, when a comment is spam or abusive, I want to
  moderate it so that my Page stays clean. — *Tool capability:* comment moderation.
  **[verify: which actions the Graph API allows — hide/delete/like — brief says only
  "manage comments"]**

## Phase 5 — Review performance

- **S12 · Post/Reel Insights.** As Kate, when a post has been live a while, I want its
  Insights so that I know how it performed. — *Tool capability:* per-post/Reel Insights.
  *Result data:* the platform's real metric names + values **[verify: exact metric list
  per surface]**.
- **S13 · Page Insights over a period.** As Kate, when I review the month, I want
  Page-level Insights over a date range so that I see the trend, not one data point. —
  *Tool capability:* Page Insights with period parameter. *Result data:* metrics over
  time.
- **S14 · Compare posts.** As Kate, when deciding what to make next, I want to compare
  recent posts' Insights so that "what worked" is grounded in data. — *Tool capability:*
  multi-post Insights comparison. *Result data:* same metrics, side by side, per post.

---

Phase-2 (multi-user) stories are deferred: the Register → Connect → Verify → Select page
state machine in [`product.md`](product.md) is the binding spec and is not re-derived
here.
