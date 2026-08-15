# Loading & Error Handling

Route-level loading states, error boundaries, and skeleton patterns for Next.js App Router.

## Error Handling

### One root `app/error.tsx`

Catches most runtime errors while preserving the app shell (nav, sidebar). This is sufficient for most apps — don't create per-route error boundaries by default.

### `global-error.tsx`

Catch-all for fatal errors in the root layout. Must define its own `<html>` and `<body>` since the root layout itself may have crashed.

### Per-route `error.tsx` only when recovery UX differs

Add a route-level `error.tsx` only when the error recovery action is unique to that route. Examples:

- A list route needs a "retry loading items" button
- A detail route needs a "go back to list" link

If the recovery UX is identical to the root error page, don't duplicate it.

### Expected errors are NOT for error boundaries

API 404s, permission denied, validation failures — these are expected application states. Handle them in-component with try/catch or conditional rendering. Error boundaries are for **unexpected runtime crashes** only.

```tsx
// ✓ Correct — expected error handled in-component
if (error?.status === 404) return <EmptyState message="Not found" />;

// ✗ Wrong — throwing to let error.tsx catch a 404
if (!item) throw new Error("Not found");
```

## Loading States

### Two complementary mechanisms

| Mechanism | When it fires | What it covers |
| --- | --- | --- |
| `loading.tsx` (route-level) | Route navigation (server streaming) | Instant skeleton while server renders. Prevents blank screens. Navigation is interruptible. |
| In-component skeleton (`isLoading` from TanStack Query) | Client-side data operations | Refetches, stale revalidation, cache misses. Granular control over specific sections. |

These are complementary, not either/or. A page typically has `loading.tsx` for navigation transitions AND in-component loading states for client-side operations.

### Every page must handle all UI states

**Default, loading, error, empty.** No state may render a blank screen.

### Skeleton best practices

- Match exact dimensions and layout of real content (prevents CLS)
- Use `role="status"` and `aria-label` for accessibility
- Use the `Skeleton` primitive from `@repo/ui`

```tsx
<div role="status" aria-label="Loading">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

## When to add per-route files

| Scenario | Add `error.tsx`? | Add `loading.tsx`? |
| --- | --- | --- |
| Standard resource page | No (root catches it) | Yes (navigation skeleton) |
| Page with unique error recovery | Yes | Yes |
| Static page (no data fetching) | No | No |

## Pinning typo'd URLs to a sub-shell's `not-found.tsx`

By default Next.js routing for an unmatched URL walks UP the segment chain to the nearest `not-found.tsx`. For deep typos (e.g. `/{workspace}/settings/foo/bar`) that walk can escape past the sub-shell layout you want preserved (e.g. WorkspaceShell's settings sub-shell) and land at the closest `(group)/not-found.tsx` — losing the sidebar context.

**To pin the not-found render inside a specific sub-shell**, add an explicit catch-all route inside that segment that calls `notFound()`. The catch-all matches any deep miss, then `notFound()` propagates up to the nearest `not-found.tsx` — which is the sub-shell's, wrapped by the sub-shell's layout.

```tsx
// app/(app)/[workspaceSlugOrId]/settings/[...catchAll]/page.tsx
import { notFound } from "next/navigation";

export default function SettingsCatchAll() {
  notFound();
}
```

Catch-all priority is the lowest in Next.js matching — static and dynamic segments still win, so this only fires when nothing else matches. Add one per group whose chrome you want preserved on deep misses. The matching `(group)/not-found.tsx` renders inside `(group)/layout.tsx` + any deeper layout.

Root `not-found.tsx` remains the chromeless fallback for URLs that escape every group (pre-auth, unresolved workspace slug).

## Vertical sizing — `min-h-full` vs `min-h-screen`

`error.tsx`, `loading.tsx`, and group-level `not-found.tsx` render **inside a layout slot**. Use `min-h-full` so the centered content sits in the middle of that slot. Using `min-h-screen` makes the content compute against the full viewport, which pushes it visually below center because the header+sidebar chrome above is part of the viewport.

```tsx
// ✓ inside a layout slot — centers within the content area
<div className="flex min-h-full w-full items-center justify-center py-12">

// ✗ inside a layout slot — content drifts below true center
<div className="flex min-h-screen w-full items-center justify-center">
```

`global-error.tsx` owns its own `<html>`/`<body>` (the root layout may have crashed). For it, `min-h-screen` is correct — there is no shell chrome to compete with.

## Spacing on full-page error/not-found surfaces

These surfaces are a single panel with stacked content blocks (badge → headline → diagnostic → action row). Per `docs/design/foundations/spacing.md`:

- **Outer content stack:** `gap-4` (16px) — block-to-block rhythm, not `gap-6` (which is section-to-section, for multiple distinct sections inside a panel)
- **Action button row:** `gap-2` (8px) — spacing.md explicitly anchors "actions-row button gap" to spacing-2; `gap-3` over-separates
- **Outer container padding:** `py-12` — full-panel context, matches `empty-and-error-states.md` §2 padding scale
- **Title ↔ subtitle inside a card header:** `mb-1` (4px) — only when these read as a header pair, not as separate blocks
