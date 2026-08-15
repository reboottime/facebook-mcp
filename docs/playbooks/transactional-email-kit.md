# Playbook: Transactional Email Kit for Trade-Services SaaS

Reusable method for wiring deploy-safe transactional email into any trade-services SaaS
(field service, cleaning, dispatch, quoting) that already has an SMS/WhatsApp channel for
customer-facing lifecycle messages. Derived from Listo's implementation
(`apps/api/src/domain/email/`) — that's the reference build; this doc is the transferable
method + copy-paste skeleton.

**Sibling doc, not a section of it:** [`security-audit-multitenant-pii.md`](security-audit-multitenant-pii.md)
covers PII/tenancy security; this doc covers "how do transactional emails get sent at all."

---

## The canonical list

Two lifecycles. **Auth is email's job — always.** **Customer lifecycle is channel-agnostic** — most
trade-services apps default it to SMS/WhatsApp (faster, higher open rate for a "on our way in 10
min" message) and use email only where SMS's 160-char/no-attachment limits are the wrong fit.

### Auth (email — no alternative channel; a user has no phone on file at sign-up time)

| Email | Trigger | Notes |
| --- | --- | --- |
| Email verification | Sign-up, or a `resend-verification` request | Enforced by whatever auth library gates unverified accounts — Better Auth's `requireEmailVerification` in Listo's case. |
| Welcome | After verification / first successful login | No universal auth-library hook for this — wire it wherever "account is now usable" is decided (post-verification, or a databaseHooks `user.create` if you want it to fire on signup itself). |
| Password reset | User requests it | Auth library almost always exposes this as a named hook (`sendResetPassword` in Better Auth) — wire it, don't hand-roll the token/expiry logic. |

### Customer lifecycle (channel already exists — decide per message, don't default to email)

| Message | Default channel | Why |
| --- | --- | --- |
| Booking confirmation | SMS/WhatsApp | Short, time-sensitive, customer expects an instant reply-channel. |
| Day-before confirm (asks for a reply) | SMS/WhatsApp | Needs a reply — email reply-tracking is friction; SMS "reply YES" is zero-friction. |
| On-our-way | SMS/WhatsApp | Minutes-scale urgency; email delivery latency (seconds–minutes, provider-dependent) isn't reliable enough. |
| Follow-up (photos, "how did we do") | SMS/WhatsApp, **email if it carries attachments the SMS channel can't** | MMS works but email is more reliable for multiple before/after photos. |
| Payment receipt | **Email preferred, SMS fallback** | Receipts are a keep-for-records artifact — email's persistence and printability beat SMS. Resolve by customer's `preferredChannel`, falling back to whichever contact method is on file (see `resolveReceiptContact` pattern below). |
| Payment reminder | SMS/WhatsApp | Same urgency logic as booking confirmation. |

**Decision rule when adding a new lifecycle message:** does it need a reply, or is it time-boxed to
minutes? → SMS/WhatsApp. Is it a record the customer keeps, or does it carry attachments/rich
formatting? → email. Everything else, match whatever the customer's `preferredChannel` says.

---

## Architecture (deploy-safety is the hard requirement)

The pattern that makes this safe to ship **before** the email provider's API key exists in
production:

1. **A sender abstraction, not a direct provider import at every call site.** One function —
   `sendEmail({ to, subject, html, text })` — that every caller uses. Provider swap (Resend →
   Postmark → SES) touches one file.
2. **The sender is a factory, not a bare env-reading function.** `createEmailSender(config, client?)`
   takes an explicit `{ apiKey, from }` and an optional injected client. Production builds a
   singleton from the validated env; tests inject a stub client. This is the same shape as
   `createCustomDomainService` (`apps/api/src/domain/site/custom-domain.ts`) — the repo's test
   suite has no `vi.mock` anywhere, dependency injection is how provider clients get tested without
   touching a module-level singleton.
3. **Missing API key ⇒ log + succeed, never throw.** `env.RESEND_API_KEY` (or equivalent) is
   `.optional()` in the zod schema — never required. No key → the sender logs a **non-PII** line
   (template name + a one-way hash of the recipient id, never the raw email/subject/body/link) and
   resolves `{ success: true }`. This is what lets `requireEmailVerification: true` ship in
   production *before* the Resend account exists — the hook fires, logs, and the sign-up request
   still returns 200.
4. **Provider-side failure ⇒ log + return failure, still never throw.** A caller in an auth hook
   or a request handler must never see a thrown error from the email send — it's fire-and-log
   after (or alongside) the durable write, mirroring the existing SMS provider
   (`apps/api/src/domain/messages/twilio.ts`).
5. **`EMAIL_FROM` gets a working default**, not `.optional()` with no fallback — so a prod deploy
   that sets only the API key is enough to go live.

## Template skeleton

One file, `templates.ts`, driven by a single `BRAND` object at the top:

```ts
export const BRAND = {
  name: "YourProduct",
  url: "https://yourproduct.example",
  supportEmail: "hello@yourproduct.example",
};
```

Every template function returns `{ subject, html, text }` and interpolates via its own args (plain
template literals — a 3-email kit doesn't need a templating engine):

```ts
export function verificationEmailTemplate({ url }: { url: string }): EmailTemplate { ... }
export function welcomeEmailTemplate({ name }: { name?: string } = {}): EmailTemplate { ... }
export function passwordResetEmailTemplate({ url }: { url: string }): EmailTemplate { ... }
```

A shared `shell(preheader, bodyHtml)` wrapper (inline CSS, one `<table>` layout, a footer with
`BRAND.name` + `BRAND.url`) keeps the three emails visually consistent without a component
library — HTML email has no CSS cascade you can rely on across clients, so inline styles are not a
shortcut, they're the only thing that reliably renders.

## Retargeting this kit at a new product

1. Edit `BRAND` (name, url, supportEmail) in `templates.ts` — every subject line and footer updates.
2. Swap the provider in `send.ts` if not using Resend (change the `ResendClient` type + the
   `createEmailSender` internals; the `sendEmail({ to, subject, html, text })` call signature at
   every call site doesn't change).
3. Re-derive the customer-lifecycle table above for the new product's actual channel mix — the
   auth table is close to universal, the lifecycle table is not (a product with no SMS channel at
   all just runs everything through email).

## Worked example — Listo

- `apps/api/src/domain/email/send.ts` — `createEmailSender` + the `sendEmail` singleton built from
  `env.RESEND_API_KEY` / `env.EMAIL_FROM`.
- `apps/api/src/domain/email/templates.ts` — `BRAND = { name: "Listo", url: "https://app.myclover.app", ... }`
  + verification / welcome / password-reset templates.
- `apps/api/src/auth/index.ts` — Better Auth's `emailVerification.sendVerificationEmail` and
  `emailAndPassword.sendResetPassword` hooks call `sendEmail(template(...), { template, recipientId })`.
- Customer lifecycle (`apps/api/src/domain/messages/defaults.ts`, 7 rules) stays SMS/WhatsApp via
  Twilio (`apps/api/src/domain/messages/twilio.ts`) — channel-split decision 2026-07-26. Payment
  receipt resolves email vs SMS per customer contact (`apps/api/src/domain/jobs/receipt.ts`,
  `resolveReceiptContact`) but its email leg was a stub until this kit existed; wiring
  `sendEmail` into `deliverReceipt`'s email branch is the natural next step, not done as part of
  the auth-email build (kept as a separate follow-up so this change stays scoped to auth).
