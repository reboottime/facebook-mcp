# Playbook: Security Audit for Multi-Tenant Trade-Services SaaS (PII)

Reusable method + bug-class catalog for auditing any multi-tenant SaaS that stores customer
**PII** (name, address, phone, photos) — field service, cleaning, trades, dispatch, quoting.
Derived from the Listo audit (2026-08-04); every "worked example" below is a real finding.

**When to run it:** before launch, before onboarding real customers, after any change to auth,
tenancy, or a public/unauthenticated surface, and on a cadence once you have real user data.

---

## Method (the transferable part)

1. **Frame by PII, not by feature.** The question is "how does one tenant's customer PII leak to
   another tenant or to an anonymous attacker" — not "does feature X work." Threat actors: (a) a
   legitimate signed-up user of *another* tenant, (b) an anonymous attacker with a link, (c) an
   insider with a low-privilege role.
2. **Five dimensions, run in parallel, adversarial, report-only.** Spawn one agent per dimension
   (below). Each is told to think like an attacker, cite `file:line`, give a concrete exploit, and
   mark findings CONFIRMED (traced) vs POTENTIAL. **No agent fixes anything** — mixing find+fix
   loses findings and creates churn.
3. **Verify before you fix.** The orchestrator independently re-reads the code path for every
   CRITICAL before relaying or fixing it. Cross-corroboration (the same finding surfaced by 2+
   dimensions) raises confidence; a single agent's claim does not.
4. **Fix in disjoint-file groups.** Group findings so each fix agent owns a non-overlapping set of
   files; run in parallel; each proves its fix with a test (e.g. "cross-org request now 403/empty").
5. **Reconcile, then commit once.** After parallel fixes, `git status` + grep each expected change +
   run full suites before committing. ⚠️ **Never let agents `git stash`/`git reset` in a shared
   working tree** — it silently reverts sibling agents' (and your own uncommitted) work. Use
   isolated worktrees, or a strict "no git state ops" instruction, or commit between waves.
6. **Deploy-safety pass.** A hardening change can brick the app (e.g. a boot-guard that throws on a
   not-yet-configured integration). Prefer **fail-closed at request time** over **fail-at-boot** for
   optional integrations; hard-fail boot only on core secrets.

## The five dimensions (what each agent checks)

- **D1 — Tenant isolation / IDOR (highest priority).** Every data query scoped by the caller's org,
  derived from the *session*, never client input — on GET, list, and especially `/:id` and nested
  sub-resources. FK inputs re-validated as belonging to the caller's org. **Include the
  unauthenticated rails** (signed links, webhooks) — they're where isolation is usually skipped.
- **D2 — Public / signed-link surfaces.** Every no-login endpoint: token entropy, expiry, single-use
  vs replayable, resource id **inside** the signed payload (not a swappable param), enumeration of
  ids/slugs, and exactly what PII each exposes.
- **D3 — Auth / session / CSRF / CORS / rate-limiting.** Cookie flags (`httpOnly`/`Secure`/
  `SameSite`), CSRF/Origin enforcement on writes, sign-up policy + email verification, password/OTP
  rules, brute-force + enumeration, role checks (RBAC).
- **D4 — Secrets / object storage / headers / transport.** Committed secrets (incl. client bundle),
  secret fail-open defaults, object-storage access (are customer photos public/enumerable?), security
  headers (HSTS/X-Frame-Options/CSP), HTTPS, webhook signature verification.
- **D5 — Injection / validation / XSS / response & log exposure / deps.** Raw SQL, zod coverage,
  stored XSS on public pages, over-exposed responses/errors, **PII in logs**, `pnpm audit`.

---

## Bug-class catalog (recurring patterns — check these first)

- **Signed-link rail skips org-scoping.** The session API is tenant-tight, but the crew/customer
  magic-link query filters by member/entity only, not org. *Listo:* `GET /api/portal/shift` returned
  every org's jobs, narrowed only by member id in JS → cross-tenant leak.
- **"Global user across tenants" trap.** If a user row is shared across orgs (matched by email/phone),
  then "is this member assigned?" is NOT proof of tenancy. A person who belongs to two tenants bridges
  them. Always add the explicit org predicate; put `organizationId` **in the signed token** at mint.
- **Missing RBAC.** "Is a member" ≠ "is an owner." Role-gate destructive/admin actions (member
  add/remove, org/site config, billing) from the **session** role, never a client-supplied `role`.
  *Listo:* any cleaner could self-promote to owner or delete the owner.
- **CSRF not actually enforced.** A permissive-CORS layer that *omits* the allow-origin header but
  doesn't *reject* still executes the write. Set `SameSite=Lax` (same-origin deploys) + an explicit
  Origin/Referer allowlist check on state-changing methods.
- **Secrets fail open.** Dev-default secrets (`dev-only-…-change-me`) with no production boot-guard;
  optional webhook token that silently no-ops verification when unset → forgeable webhooks.
- **Credentials / tokens in logs.** Request loggers that log the full URL leak `?token=` bearer
  credentials into persistent logs. **PII in logs**: name/address/phone in "would-send" no-provider
  log paths (which are the *default* path pre-integration).
- **Committed secret in `.env.example`.** A real-shaped key pasted where a placeholder belongs — in
  git history forever. Rotate at the provider; blanking the file doesn't revoke it.
- **Object storage.** Customer home photos in a public/enumerable bucket. Want: private bucket,
  UUID keys, presigned + short-lived read URLs, org-scoped.
- **Sensitive field leaks on the READ path while the WRITE path is gated.** A field's mutation
  routes are correctly `requireRole`-gated, but the list/detail GET that *joins* the same field is
  only `requireMembership` — so a low-privilege user reads what they can't write. *Listo (2026-08-06):*
  `PUT/DELETE /members/:id/pay-rate` were owner/admin-gated, but `GET /members` returned
  `payRateCents` (every teammate's + the owner's wage) to any member, including cleaners. Gate the
  read too — strip the field per-row for non-admins. Defense-in-depth: also gate it in the UI; a
  role check on the write route is not a read-path control.
- **New nullable FK on a sub-resource skips the org check its siblings enforce.** When a feature adds
  an FK column, the accept-and-store path often omits the `assertXInOrg` re-validation every *other*
  FK on that route already applies, and a downstream `SELECT … WHERE id = ?` reads it with no org
  predicate → another tenant's content is pulled into the attacker's own org. *Listo (2026-08-06):*
  `booking.checklistTemplateId` was accepted on booking create/update unvalidated, and
  `instantiateChecklist` looked the template up with no org scope. Not enumerable (random UUID) but a
  real broken-object-level-authorization. Fix **both** layers: validate at write, org-scope the read.

## Reusable checklist

- [ ] Every `/:id` read/write constrained by session-derived org (grep for `eq(x.id, …)` without an org predicate)
- [ ] New/changed FK inputs on sub-resources re-validated in-org (not only the "main" entity's `customerId`/`jobId`); the downstream lookup that consumes the FK is org-scoped too
- [ ] Sensitive fields (wage, cost, margin) gated on the READ/list path, not only the write route; gated in the UI as defense-in-depth
- [ ] Signed tokens carry the org; unauthenticated queries filter by it; ids are inside the signed payload
- [ ] Destructive/admin routes role-gated from session membership
- [ ] `SameSite=Lax` in prod + Origin allowlist on writes; auth cookies `httpOnly; Secure`
- [ ] Production boot-guard on core secrets; optional integrations fail **closed at request time**, not at boot
- [ ] No secrets in git (history included), client bundle, or logs; no PII in logs
- [ ] Object storage private + UUID keys + presigned expiring reads
- [ ] Security headers (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, CSP); `pnpm audit` clean of high/critical runtime deps
- [ ] Registration policy + email verification decided; rate limiting on public + write + auth surfaces
- [ ] All raw SQL parameterized; all mutations zod-validated; no stored XSS on public pages
