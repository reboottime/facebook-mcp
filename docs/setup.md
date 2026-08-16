# Social MCP — Setup Record & Roadmap

The canonical entry point for configuring and running this server. Three parts:

1. [The current install](#1-current-install-as-built-2026-08-15) — the exact app that
   exists today, with its real IDs.
2. [Roadmap: configure your own app (dev mode)](#2-roadmap-configure-your-own-app-dev-mode)
   — what a new operator does to reproduce it.
3. [Roadmap: turn it into a multi-user business app](#3-roadmap-turn-it-into-a-multi-user-business-app)
   — the upgrade path if others should use it.

Detailed walkthroughs live in [`personal-use-setup.md`](personal-use-setup.md)
(dev-mode path, step by step) and [`meta-app-setup.md`](meta-app-setup.md) (full
go-live path). This doc is the map; those are the terrain.

## 1. Current install (as built, 2026-08-15)

| Item | Value |
| --- | --- |
| Meta app name | `social-mcp` |
| **App ID** | `1053704090779529` |
| Business portfolio | Ai4smb — **business ID** `1385996026366592` (unverified; fine for dev mode) |
| Facebook Page | AI for Small Business — **Page ID** `1245287472003763` |
| Instagram | **Not linked yet** — `instagram_*` tools inactive until the IG professional account is connected to the Page (Page → Settings → Linked accounts) |
| App mode | Development Mode, permanently (personal use — no verification, no App Review) |
| Access model | Standard Access; all 11 permissions "Ready for testing" |
| Permissions granted | `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_read_user_content`, `read_insights`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `business_management` (+ `publish_video`) |
| Token | Long-lived user token in `apps/mcp/.env.local` (`META_ACCESS_TOKEN`); created 2026-08-15, lives ~60 days → renew around **mid-October 2026** via Graph API Explorer → Extend Access Token |
| Dashboard | <https://developers.facebook.com/apps/1053704090779529/dashboard/?business_id=1385996026366592> |
| Use cases config | <https://developers.facebook.com/apps/1053704090779529/use_cases/?business_id=1385996026366592> |
| Verified | Live smoke test passed 2026-08-15: `health` (token holder + Page resolved), `list_pages`, `list_posts` against Graph API v26.0 |

Still unverified live: a real `publish_post` (scheduled + delete), and the multi-photo
`attached_media[i]` syntax (undocumented by Meta — test a 2-photo scheduled post first).

## 2. Roadmap: configure your own app (dev mode)

The whole dev-mode path needs **no business verification, no App Review, no Live
Mode** — those gate serving *other* users, not your own Pages. Full detail:
[`personal-use-setup.md`](personal-use-setup.md).

1. **Create the app** at <https://developers.facebook.com/apps> (type **Business**).
   The name need not be unique — the App ID is the identity.
2. **Wizard traps to know:**
   - *Use cases step:* pick **Manage everything on your Page** (Content management),
     plus the Instagram content use case (`instagram_content_publish` in its list).
     Skip Ads/Threads use cases.
   - *Business step:* connecting a portfolio is optional and inert in dev mode.
   - *Requirements step* (verification + App Review): informational — click Next, do
     nothing.
   - *Settings → Basic:* leave privacy/ToS/data-deletion URLs **empty**. Never enter a
     facebook.com URL as placeholder — the save fails with a generic "Something Went
     Wrong" modal.
3. **Permissions live under Use cases**, not App Review. Dashboard → Use cases →
   Customize → Add each permission until all 11 show **"Ready for testing"** (that
   status = Standard Access active = all you need). The Graph API Explorer dropdown
   only offers permissions the app's use cases carry.
4. **Token:** Graph API Explorer → select app → add the 11 permissions → Generate
   Access Token (grant against your Page + IG) → **Extend Access Token** → paste into
   `apps/mcp/.env.local` as `META_ACCESS_TOKEN`. Renew every ~60 days the same way.
5. **Build + verify:** `pnpm install && pnpm exec turbo run build --filter=mcp`, then
   `pnpm --filter mcp verify:stdio` (zero-env round-trip; it deliberately ignores your
   token). Live check: call `health` from any MCP client — expect your name,
   `pagesCount ≥ 1`, and a resolved Page.

### Run it from an MCP client

- **Claude Code:**

  ```sh
  claude mcp add social-mcp -- node <repo>/apps/mcp/dist/index.js
  ```

- **Hermes (or any agent runtime):** same stdio contract — spawn
  `node <repo>/apps/mcp/dist/index.js` with `apps/mcp/` as cwd so `.env.local` loads.
  If the runtime prefers a remote server, run the HTTP transport instead
  (`pnpm --filter mcp dev:http`) and register `http://localhost:8787/mcp`; the client
  then authenticates via the built-in OAuth flow rather than the env token
  ([`personal-use-setup.md`](personal-use-setup.md) §5).

## 3. Roadmap: turn it into a multi-user business app

Nothing needs to be rebuilt — the phase-2 HTTP transport, OAuth server, and per-user
token storage are already implemented and tested. The upgrade is entirely a
Meta-side + deployment process. Full detail: [`meta-app-setup.md`](meta-app-setup.md)
§§2, 5–7.

1. **Interim option, zero paperwork:** add individual users as **testers** (Dashboard →
   App Roles). They can connect their own Pages through the OAuth flow under Standard
   Access. Good for a private beta; skip straight here if "others" means a few people.
2. **Facebook Login product:** add redirect URI(s) — locally
   `http://localhost:8787/auth/facebook/callback`, later
   `https://<domain>/auth/facebook/callback`.
3. **Real URLs in Settings → Basic:** privacy policy, terms, and a user data deletion
   page (or implement Meta's deletion callback) on a domain you own — all three are
   review prerequisites.
4. **Business verification** on the portfolio (`1385996026366592`): requires a
   **registered legal entity** whose documents match the portfolio name/address —
   business registration, address proof, ideally a business-domain email. Days to
   weeks; this is the long pole. If Ai4smb isn't a registered business yet, that
   registration comes first.
5. **App Review:** request Advanced Access for each of the 11 permissions. Each needs
   a screencast of the app exercising that permission plus a written use case — record
   them against the local HTTP flow.
6. **Live Mode:** flip after approvals. Now arbitrary users can "Connect with
   Facebook".
7. **Deploy** (Fly.io + Neon): [`fly-deployment.md`](fly-deployment.md) — secrets from
   `.env.example`, migrations out-of-band (`pnpm --filter mcp db:migrate`), then point
   the Meta app's redirect URI + `PUBLIC_URL` at the live domain.
