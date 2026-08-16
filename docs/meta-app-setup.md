# Meta App Setup & Live Verification

Everything needed to take the shipped server from "runs against mocks" to "talks to the
real Meta Graph API": registering the Meta developer app, getting credentials, wiring the
environment, and smoke-testing both transports. Deployment specifics live in
[`fly-deployment.md`](fly-deployment.md).

> **Personal use only?** If the server will only ever manage your own Page/IG account,
> follow [`personal-use-setup.md`](personal-use-setup.md) instead — it skips App
> Review, business verification, and Live Mode entirely (steps 6–7 here don't apply).

Meta's official registration guide:
<https://developers.facebook.com/documentation/development/create-an-app#app-creation-steps>

## 1. Create the Meta developer app

1. Go to <https://developers.facebook.com/apps> → **Create App** (see the official guide
   above for the current flow).
2. Give it a name (e.g. "Social MCP"). If the flow asks for an app type, choose
   **Business** — it is required for the Pages + Instagram Graph API access this server
   uses.
3. The app starts in **Development Mode** — sufficient for the stdio (phase-1) setup; no
   App Review is required for accounts that are developers/testers of the app.
4. Note the **App ID** and **App Secret** (Settings → Basic).

### Selecting use cases — pick Content management, NOT Ads

The current creation flow includes a **Use cases** step (a wizard:
App details → Use cases → Business → Requirements → Overview). The use cases you pick here
decide which products and permissions the app gets — pick the wrong ones and you add
Marketing API access you don't need while missing the Page/Instagram content permissions
you do.

Social MCP publishes and schedules posts and Reels, manages comments, reads Page/post
Insights, and cross-posts to a linked Instagram account. That is **Content management**.
It does **not** do ads, lead capture, app-install campaigns, or Threads.

- In **Filter by**, choose **Content management**.
- Select the **Facebook Page** management use case — the one whose permission list
  includes `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`,
  `pages_read_user_content`, `pages_show_list`, and `read_insights`.
- Select the **Instagram content** use case — the tell is `instagram_content_publish` in
  its permission list (also `instagram_basic`, `instagram_manage_comments`,
  `instagram_manage_insights`). It may appear under Content management or under a
  combined **Instagram** use case.
- **Do NOT select** any *Ads and monetization* use case (Create & manage ads, Measure ad
  performance, Capture & manage ad leads, app ads), or **Access the Threads API**. None
  of them apply to this product — "measure ad performance" is *ad* data, not the Page/post
  Insights this server reads.

> **You can skip this wizard entirely for the Phase-1 smoke test.** Generating a
> Development-Mode token for **your own** Page (step 3) does not require completing the
> use-case / App Review flow — you grant the permissions directly in Graph API Explorer.
> The use-case selection only becomes load-bearing when you go **Live** so that *other*
> users can sign in (phase 2, step 6), because App Review is requested per use case.

## 2. Add Facebook Login (needed for the HTTP transport)

Only the multi-user HTTP transport (phase 2) uses Facebook Login, but adding it during
app creation is harmless.

1. Dashboard → **Add Product** → **Facebook Login** → type: **Web**.
2. Settings → **Valid OAuth Redirect URIs**: add

   ```
   http://localhost:8787/auth/facebook/callback
   ```

   The path is `/auth/facebook/callback` and the default port is **8787** (both from
   `apps/mcp/src/http/`). If you set `PORT` or `PUBLIC_URL`, adjust the URI to match —
   the server derives its redirect URI from `PUBLIC_URL`. Localhost redirects are
   allowed while the app is in Development Mode.

## 3. Get a stdio (phase-1) dev token

1. Open the **Graph API Explorer** (<https://developers.facebook.com/tools/explorer>)
   and select your app.
2. Add permissions: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`,
   `pages_manage_engagement`, `pages_read_user_content`, `read_insights`,
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`,
   `instagram_manage_insights`, `business_management`.
3. Generate a User Access Token → grant it against your Page(s) and the linked
   Instagram Business account.
4. Exchange it for a long-lived token: blue **ⓘ** next to the token → **Open in
   Access Token Tool** (<https://developers.facebook.com/tools/accesstoken/>) →
   "Extend Access Token", or
   `GET /oauth/access_token?grant_type=fb_exchange_token&...`. Inspect scopes/expiry
   anytime in the Access Token Debugger:
   <https://developers.facebook.com/tools/debug/accesstoken/>.
5. Create `apps/mcp/.env.local` (the **app directory**, not the repo root — this is
   where `src/env.ts` reads it):

   ```dotenv
   META_ACCESS_TOKEN=<long-lived token>
   # optional — only needed if you admin more than one Page:
   META_PAGE_ID=<page id>
   ```

   See `apps/mcp/.env.example` for the full annotated variable list. Every variable is
   optional; both transports boot with none set.

## 4. Live stdio smoke test (~5 min)

1. From the repo root: `pnpm install && pnpm exec turbo run build --filter=mcp`.
2. Optional pre-flight without any MCP client: `pnpm --filter mcp verify:stdio`
   (runs the full 12-tool round-trip; with no token it proves zero-env behavior).
3. Add the stdio server to your MCP client. For Claude Code:

   ```sh
   claude mcp add social-mcp -- node <repo>/apps/mcp/dist/index.js
   ```

4. Call `health` → expect the token holder's name, page count, and resolved Page. Then
   `list_pages`, `list_posts`, and a `publish_post` with `scheduled_publish_time` a day
   out (safe — cancel it afterwards with `delete_post`).

### Known caveat: multi-photo posts

Multi-photo posts use the `attached_media[i]` indexed-JSON parameter syntax, which
Meta's v26.0 reference table omits (it is community-documented). The first live
multi-photo publish confirms or refutes it — test a 2-photo scheduled post specifically.

## 5. Wire the HTTP transport (phase 2) to real credentials

1. Add to `apps/mcp/.env.local`:

   ```dotenv
   FB_APP_ID=<app id>
   FB_APP_SECRET=<app secret>
   TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>
   PUBLIC_URL=http://localhost:8787
   ```

2. Start the HTTP server (`pnpm --filter mcp dev:http`), open the `PUBLIC_URL` root in
   a browser, click **Connect with Facebook**, and complete login. Your account works
   in Development Mode because it is a developer of the app.
3. Add `<PUBLIC_URL>/mcp` as a remote MCP server in your client → complete the OAuth
   consent → run `list_pages` → `select_page` → any tool call.

## 6. App Review + business verification (go-live long pole)

Required before the HTTP transport can serve users who are not developers/testers of
the app.

1. **Business verification:** Meta Business Suite → Business Settings → Security
   Center → Start Verification. Needs legal business info; takes days to weeks.
2. **App Review:** request Advanced Access for every permission listed in step 3.2.
   Each needs a screencast of the app using the permission plus a written use case —
   build the screencasts off the local phase-2 flow.
3. Complete the data handling questionnaire and provide a privacy policy URL (both
   required before Live Mode).
4. Switch the app to **Live Mode** after approvals.

## 7. Deploy (Fly.io + Neon)

Follow [`fly-deployment.md`](fly-deployment.md); Meta-specific notes:

1. Create a Neon project → copy the **direct** (non-pooler) connection string.
2. `flyctl launch` per the deployment doc, then `flyctl secrets set` the variables from
   step 5.1 plus `DATABASE_URL`.
3. Run migrations out-of-band before the first deploy (the container does not
   auto-migrate): `pnpm --filter mcp db:migrate` with `DATABASE_URL` pointing at Neon.
4. `flyctl deploy --remote-only`, then update the Meta app's Valid OAuth Redirect URI
   and `PUBLIC_URL` to the live domain (`https://<app>.fly.dev/auth/facebook/callback`).
