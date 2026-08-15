# App Folder Structure

How to organize a Next.js App Router dashboard. Covers both the **high-level composition** (which route groups exist and what each owns) and the **per-segment mechanics** (special files, private folders, server vs client).

For error/loading nuance, see [loading-and-errors](app-conventions.loading-and-errors.md).

## Composition: route groups

A dashboard has up to four layout boundaries. Each is a Next.js route group `(name)` — URL-invisible.

| Group          | Purpose                                          | Gate                              | Shell                              |
| -------------- | ------------------------------------------------ | --------------------------------- | ---------------------------------- |
| `(auth)`       | Public sign-in / sign-up                         | none                              | Centered card                      |
| `(onboarding)` | Authed users not yet onboarded                   | session + not-onboarded           | Minimal                            |
| `(app)`        | Major business operations (lists, detail, dashboards) | session [+ onboarded]        | App shell (operations sidebar + topbar) |
| `(manage)`     | Settings / admin (profile, members, billing, …)  | session [+ admin for admin pages] | Manage shell (settings sidebar)    |

Two reasons to keep `(app)` and `(manage)` separate even though both are authed:
1. Different shell chrome — operations sidebar vs settings sidebar.
2. Different mental mode — "doing work" vs "configuring the workspace".

Drop a group if the project does not need it. `(onboarding)` is optional. Collapse `(manage)` into `(app)/settings/` only when there are fewer than ~5 distinct settings sub-pages — at scale, the chrome split (operations sidebar vs settings sidebar) earns its keep.

## Tree

```
src/
├── app/
│   ├── layout.tsx                    # Root: <html>, ThemeProvider, Toaster, metadata template
│   ├── globals.css
│   ├── global-error.tsx              # Outside root layout — own <html>/<body>
│   ├── not-found.tsx                 # Root 404 — chromeless fallback for pre-auth / unresolved-workspace
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                # Centered container
│   │   └── {login, register}/page.tsx
│   │
│   ├── (onboarding)/
│   │   ├── layout.tsx                # requireSession + redirect if onboarded
│   │   └── {step}/page.tsx
│   │
│   ├── (app)/
│   │   ├── layout.tsx                # requireSession + <AppShell>
│   │   ├── loading.tsx               # Segment Suspense fallback
│   │   ├── error.tsx                 # Segment error boundary ("use client")
│   │   ├── not-found.tsx             # Universal authed 404
│   │   ├── page.tsx                  # Home
│   │   └── {resource}/
│   │       ├── page.tsx              # Index / list
│   │       ├── _components/
│   │       ├── _data/
│   │       └── [id]/
│   │           ├── page.tsx          # Detail — renders <ResourceNotFound /> inline (see § Resource-detail 404)
│   │           └── _components/
│   │
│   └── (manage)/
│       ├── layout.tsx                # requireSession + <ManageShell>
│       ├── not-found.tsx             # 404 rendered inside ManageShell
│       └── manage/
│           ├── layout.tsx            # Section header / shared context
│           ├── [...catchAll]/page.tsx # notFound() — funnels typo'd URLs into the sub-shell's not-found.tsx
│           └── {section}/page.tsx    # Settings section (members, billing, …)
│
├── components/                       # Cross-route shared UI
│   └── shell/                        # App shell internals (nav, avatar, brand mark)
│
├── lib/
│   ├── auth/                         # session.ts (get/set/require), actions.ts (sign-in/out)
│   └── cn.ts
│
└── middleware.ts                     # Reverse-gate: authed users away from /login (renamed to proxy.ts in Next.js 19.x)
```

## Layout layering

```
RootLayout (app/layout.tsx)
  └── <html>, <body>, ThemeProvider, Toaster
      └── GroupLayout ((app)/layout.tsx)
          └── requireSession() + <Shell>
              └── SegmentLayout (optional)
                  └── page.tsx
```

Rules:
- **Root layout** is the **only** place for `<html>`, `<body>`, `<ThemeProvider>`, `<Toaster>`. Anything global lives here.
- **Group layouts** own the auth gate and the shell. Never gate inside a `page.tsx`.
- **Segment layouts** are for repeated chrome within a sub-tree (e.g. a settings page-header context provider that every settings page shares).

### Toaster — root only

`<Toaster />` mounts once at the root layout, so it serves every route (auth feedback, onboarding, app, manage). Do **not** mount a second Toaster inside a group layout; toasts emitted during cross-group navigation would unmount mid-flight.

## Auth gating — two directions

| Direction                                    | Mechanism                                       | Where                                              |
| -------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Unauthed → public auth pages OK              | none                                            | `(auth)` has no gate                               |
| Unauthed → protected route blocked           | `requireSession()` redirects to `/login`        | `(app)`, `(onboarding)`, `(manage)` group layouts  |
| Authed → auth pages redirected away          | Middleware redirects `/login`, `/register` → `/` | `middleware.ts`                                    |

Two mechanisms because they fire at different times. Layout gating is server-render time (no flash). Middleware fires per-request — needed for the reverse direction where there is no layout to host the redirect.

### Onboarding gate (when onboarding exists)

The two-sided gate composes naturally:
- `(onboarding)/layout.tsx`: `requireSession()` → if `session.onboarded`, redirect to `/`.
- `(app)/layout.tsx`: after `requireSession()`, if `!session.onboarded`, redirect to onboarding entry.

Onboarding completion is a server action that sets `session.onboarded = true` then redirects to `/`.

## Error / 404 hierarchy

Most-specific wins. See [loading-and-errors](app-conventions.loading-and-errors.md) for when to add per-route variants.

| File                                            | Fires when                                                          | In root layout?               |
| ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| `app/global-error.tsx`                          | Root layout itself crashed                                          | **No** — own `<html>/<body>`  |
| `app/not-found.tsx`                             | URL escapes every group boundary (pre-auth or unresolved workspace) | Yes — root layout only, no AppShell |
| `app/(app)/error.tsx`                           | Page/layout under `(app)` threw                                     | Yes — toaster/theme intact    |
| `app/(app)/not-found.tsx`                       | `notFound()` under `(app)` with no closer handler                   | Yes — in-chrome with AppShell |
| `app/(group)/{sub-shell}/[...catchAll]/page.tsx` | URL inside a sub-shell matches no segment (§ Sub-shell catch-all)   | Yes — funnels into sub-shell's `not-found.tsx` |
| Inline `<ResourceNotFound />`                   | Resource detail query resolves to "doesn't exist" (§ Resource-detail 404) | Yes — rendered as a state branch of the detail page |
| ~~`app/(app)/{resource}/[id]/not-found.tsx`~~   | **FORBIDDEN** — render inline in the detail page instead (§ Resource-detail 404) | — |

Notes:
- `global-error.tsx` renders **outside** the root layout, so it must define its own `<html>` and `<body>`. There is no `ThemeProvider` in scope; inline a small script in `<head>` that reads the same `localStorage.theme` key `next-themes` uses and sets `data-theme` + `color-scheme` on `<html>` before first paint. This mirrors next-themes' own FOUC-prevention behavior and honors the user's in-app theme choice (not just OS prefs).
- Any `error.tsx` is a **client component** (`"use client"`) — it receives `reset()` as a prop.
- Per-segment `error.tsx` / `not-found.tsx` are optional. Add only when the copy or recovery action differs from the parent.
- Expected errors (API 404, validation, permission) are **not** for boundaries — handle inline.

### Resource-detail 404 — render inline, not via `[id]/not-found.tsx`

For dynamic resource detail routes (`[id]`, `[name]`, etc.), render the "doesn't exist" state **inline within the detail view** as one branch of the page's query-state switch. Do not create a sibling `[id]/not-found.tsx`.

Why: a detail page already branches on query state (loading → error → not-found → success) and all four branches share the same chrome — breadcrumb, parent context, page-shell padding. Splitting not-found into `notFound()` + `[id]/not-found.tsx` forces rebuilding that context outside the page component, and collapses two distinct states ("load failed — retryable" vs. "doesn't exist — not retryable") into a single boundary file.

```tsx
// {resource}/[id]/_components/detail-view.tsx
const query = useQuery(...);
if (query.isPending) return <DetailSkeleton />;
if (query.isError)   return <ErrorState onRetry={query.refetch} />;
if (query.data == null) return <ResourceNotFound {...resourceCopy} />;
return <DetailView data={query.data} />;
```

Factor the not-found visual into a shared primitive (a `ResourceNotFound` component) so every resource type renders the same shape; the detail view supplies resource-specific copy and the parent list link.

Server-side `notFound()` from `page.tsx` is reserved for resources fetched synchronously on the server with no client hydration boundary. When the page uses `HydrationBoundary` + a client view, existence checks belong in the client view as above.

### Sub-shell catch-all

Without an explicit catch-all, deep URL misses (e.g. `/{ws}/settings/foo/bar`) walk UP the segment chain past the sub-shell layout to whichever `not-found.tsx` is nearest above — losing the sub-shell sidebar. Fix: add `[...catchAll]/page.tsx` that calls `notFound()`, which pins propagation at this segment and lands in the sub-shell's own `not-found.tsx` (still wrapped by its layout).

```tsx
// app/(group)/{sub-shell}/[...catchAll]/page.tsx
import { notFound } from "next/navigation";
export default function CatchAll() { notFound(); }
```

#### Decision tree — per folder

```
For every folder in app/, ask one question:

  Does this folder have its OWN layout.tsx?
  (sidebar / sub-nav / chrome that the parent doesn't have)
         │
    ┌────┴─────┐
    │          │
   YES        NO
    │          │
    ▼          ▼
   BOTH      NEITHER
   ┌────────────────────┐    ← parent's chrome
   │ not-found.tsx      │      already covers this
   │ [...catchAll]/     │      level; the parent or
   │   page.tsx         │      root not-found.tsx
   │   → notFound()     │      handles it
   └────────────────────┘

Exception: app/ root always gets not-found.tsx (global fallback).
```

**Hard rule:** every segment with its own `layout.tsx` gets BOTH files. No exceptions. If you skip the catch-all, typos under that segment lose the sub-shell chrome — silently, and the engineer who added the segment is the one who notices last.

Full mechanics in [loading-and-errors § Pinning typo'd URLs to a sub-shell's `not-found.tsx`](app-conventions.loading-and-errors.md#pinning-typod-urls-to-a-sub-shells-not-foundtsx).

## Per-segment mechanics

### Special files

| File             | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `page.tsx`       | Route component (required)                                             |
| `layout.tsx`     | Wrapper, preserves state across navigation within the segment          |
| `error.tsx`      | Error boundary for the segment (client component)                      |
| `loading.tsx`    | Suspense fallback during server render                                 |
| `not-found.tsx`  | 404 for the segment                                                    |

### Route-private folders

Folders prefixed with `_` are not routed. Use them for code only this segment imports.

```
{resource}/
├── _components/         # Route-private UI
│   ├── index.ts         # Barrel export (optional)
│   └── *.tsx
├── _data/               # Route-private data shapes, loaders, fixtures
├── _hooks/              # Route-private hooks (when extensive)
├── page.tsx
└── layout.tsx
```

Add `_data/` and `_hooks/` only when the segment has enough to warrant the split.

### Server vs client components

- **Default**: server components (no directive).
- **`"use client"`**: only for stateful/interactive components and any `error.tsx`.
- **Pattern**: a server `page.tsx` fetches data, then passes it into a client `_components/` interactive shell.

## Cross-route shared

| Location                 | Contents                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `src/components/`        | UI primitives or composite components imported by more than one route group |
| `src/components/shell/`  | App shell internals (nav links, avatar menu, brand mark, sidebar context) |
| `src/lib/`               | Non-UI utilities (auth, formatting, fetch wrappers)                   |

**Use `src/components/`** for cross-route UI. Flat, project-wide, no relationship to routing. The `app/_components/` alternative (colocated with `app/`) is rejected here — it conflates "route-private" (underscore-prefixed folders) with "cross-route shared," which makes ownership ambiguous.

When a component is consumed by only one route group, put it inside that group's `_components/` instead.

## Cloning checklist

Starting a new dashboard from this structure:

- [ ] Update `app/layout.tsx` metadata template (`"%s | <Product>"`)
- [ ] Replace brand mark imports
- [ ] Wire real auth in `lib/auth/`
- [ ] Wire `<ResourceNotFound />` copy per resource type (parent list link, entity noun) — see § Resource-detail 404
- [ ] Add `[...catchAll]/page.tsx` to every sub-shell that has its own `layout.tsx` — see § Sub-shell catch-all
- [ ] Decide which groups apply: drop `(onboarding)` or `(manage)` if not needed
- [ ] Edit middleware matcher if auth route names change
- [ ] Edit root `not-found.tsx` and `(app)/not-found.tsx` copy + home-link target
