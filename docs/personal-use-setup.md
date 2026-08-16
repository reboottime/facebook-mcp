# Personal-Use Setup (single operator, no App Review)

The complete setup path when the server manages **only your own** Facebook Page +
linked Instagram Business account. This is the "Development Mode forever" path — a
fully supported, permanent state, not a trial.

For the multi-user / public path (App Review, business verification, Live Mode), see
[`meta-app-setup.md`](meta-app-setup.md).

## What you will NEVER need on this path

- **Business verification** — no legal entity, no documents. Verification only gates
  Advanced Access, i.e. serving users who don't have a role on the app.
- **App Review / Advanced Access** — Standard Access (automatic) covers every
  permission fully for Pages/IG accounts owned by people with an app role.
- **Live Mode** — the app stays in Development Mode indefinitely.
- **Privacy policy URL, Terms of Service URL, User data deletion URL** — can stay
  empty in Settings → Basic.

The one boundary: only accounts with a **role on the app** (you, plus anyone you add
as developer/tester) can use it. To let a friend connect their own Page, add them as a
tester (Dashboard → App Roles) — still no verification needed.

## 1. Create the Meta developer app

1. <https://developers.facebook.com/apps> → **Create App**. Official guide:
   <https://developers.facebook.com/documentation/development/create-an-app#app-creation-steps>
2. Name it (the name does not need to be globally unique — the App ID is the
   identity). If asked for an app type, choose **Business**.
3. **Use cases wizard:** pick **Manage everything on your Page** (under Content
   management) plus the **Instagram content** use case (the tell is
   `instagram_content_publish` in its permission list). Avoid anything under *Ads and
   monetization* or *Threads*; details in [`meta-app-setup.md`](meta-app-setup.md) §1.
   The **Requirements** step (business verification / App Review) is informational —
   click Next, do nothing.
4. **Business portfolio step:** connecting one is optional and benign (it's an
   organizational container, not a legal entity — no obligations are created, and it's
   reversible in Business Settings → Apps). Connect yours or pick "I don't want to
   connect a business portfolio yet"; nothing on this path depends on it.
5. Note the **App ID** and **App Secret** (Settings → Basic).

### Settings → Basic, personal-use edition

- **App icon / display name / contact email** — fill in if you like; cosmetic here.
- **Privacy policy, Terms of Service, User data deletion** — leave **empty**.
  Do **NOT** enter `https://www.facebook.com/` (or any Meta domain) as a placeholder:
  the dashboard rejects Meta-owned domains in these fields, and the failed save
  surfaces as a generic "Something Went Wrong" modal with no field-level hint. Empty
  is valid in Development Mode; if you want non-empty values, use a domain you own.
- **App domains** — leave empty (localhost redirects work in dev mode without it).
- **Category** — "Business and pages" fits; cosmetic.

### Make sure all 11 permissions are on the app

The Graph API Explorer only offers permissions the app's **use cases** carry — if the
token dropdown (step 3) is missing permissions, fix it here, not in App Review:

1. Open **Dashboard → Use cases** (left sidebar):
   `https://developers.facebook.com/apps/<APP_ID>/use_cases/`
2. **Customize** the Page use case → Permissions tab → click **Add** on any permission
   not yet added: `pages_manage_posts`, `pages_manage_engagement`,
   `pages_read_user_content`, `pages_read_engagement`, `pages_show_list`,
   `read_insights`.
3. If no Instagram use case exists: **Add use case** → the Instagram content one →
   add `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`,
   `instagram_manage_insights`. Add `business_management` wherever it's offered.
4. Goal state: every permission shows **"Ready for testing"** (= Standard Access
   active, which is all this path needs). You can audit the full list under
   **App Review → Permissions and Features** — but never click "Add to App Review" /
   "Go to App Review" there; that's the Advanced Access flow you don't need.

## 2. Add Facebook Login (only if you'll run the HTTP transport)

The stdio transport (steps 3–4) doesn't use Facebook Login at all — skip this section
if stdio is all you need.

1. Dashboard → **Add Product** → **Facebook Login** → type **Web**.
2. Settings → **Valid OAuth Redirect URIs**:

   ```
   http://localhost:8787/auth/facebook/callback
   ```

   Default port is **8787**; if you set `PORT`/`PUBLIC_URL`, match them. Localhost
   redirects are allowed in Development Mode.

## 3. Get your token

1. Open the **Graph API Explorer**: <https://developers.facebook.com/tools/explorer> →
   right panel → **Meta App** dropdown → select your app.
2. **Permissions** → *Add a Permission* → select all 11: `pages_show_list`,
   `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`,
   `pages_read_user_content`, `read_insights`, `instagram_basic`,
   `instagram_content_publish`, `instagram_manage_comments`,
   `instagram_manage_insights`, `business_management`. (Missing from the dropdown?
   → fix the use cases first, §"Make sure all 11 permissions are on the app", then
   fully reload the Explorer.)
3. Click **Generate Access Token** → a Facebook dialog opens → when asked which
   assets, tick your Page(s) **and the linked IG account** → approve all permissions.
4. Extend to long-lived (~60 days): click the blue **ⓘ** next to the token field →
   **Open in Access Token Tool** (<https://developers.facebook.com/tools/accesstoken/>)
   → **Extend Access Token** at the bottom → copy the extended `EAA…` token.
   (Alternative: `GET /oauth/access_token?grant_type=fb_exchange_token&...`.)
   To inspect a token's scopes/expiry later, use the **Access Token Debugger**:
   <https://developers.facebook.com/tools/debug/accesstoken/>.
5. Create `apps/mcp/.env.local` (the **app directory**, not the repo root):

   ```dotenv
   META_ACCESS_TOKEN=<long-lived token>
   # optional — only if you admin more than one Page:
   META_PAGE_ID=<page id>
   ```

**Token lifetime:** a long-lived user token lasts ~60 days. When calls start failing
with an expired-token error, repeat steps 3.3–3.4 and paste the new token into
`.env.local`. (The HTTP transport, if you use it, refreshes its stored tokens
automatically.)

## 4. Smoke test

1. From repo root: `pnpm install && pnpm exec turbo run build --filter=mcp`.
2. Optional pre-flight: `pnpm --filter mcp verify:stdio` (full 12-tool round-trip).
3. Add to your MCP client — for Claude Code:

   ```sh
   claude mcp add social-mcp -- node <repo>/apps/mcp/dist/index.js
   ```

4. Call `health` → expect token holder name, page count, resolved Page. Then
   `list_pages`, `list_posts`, and a `publish_post` with `scheduled_publish_time` a
   day out (cancel after with `delete_post`).
5. **First-live-use caveat:** multi-photo posts use the `attached_media[i]` syntax
   Meta's v26.0 reference omits — verify a 2-photo scheduled post specifically.

## 5. Optional: HTTP transport for yourself

Useful if you want the server reachable from multiple clients/devices instead of
stdio-per-client. Your own account works in the login flow because you're a developer
of the app.

1. Add to `apps/mcp/.env.local`:

   ```dotenv
   FB_APP_ID=<app id>
   FB_APP_SECRET=<app secret>
   TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>
   PUBLIC_URL=http://localhost:8787
   ```

2. `pnpm --filter mcp dev:http`, open `PUBLIC_URL` in a browser, **Connect with
   Facebook**, complete login.
3. Add `<PUBLIC_URL>/mcp` as a remote MCP server → OAuth consent → `list_pages` →
   `select_page` → tool calls.

## Known API limits on this path (researched 2026-08-15)

Same limits apply to everyone, but worth knowing before you plan features:

- The API can only **engage on content your Page owns** — reply to comments on your
  posts, private replies, DMs within the 24-hour window, react to @mentions of your
  Page. There is no API to follow accounts, read a feed of followed accounts, or
  like/comment on other Pages'/users' content.
- **Groups**: the Groups API was removed (Graph v19, April 2024) — no automated group
  posting or commenting, for Pages or users. Joining/commenting in groups as your
  Page is manual-UI-only (and per-group admin permission).
- **Personal profiles** are entirely outside the API — no reading or notification of
  replies to your personal posts/comments. Use Facebook's own email/push
  notifications for that.
