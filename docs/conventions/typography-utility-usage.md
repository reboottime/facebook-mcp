# Typography Utility Usage

## The two layers

### DS layer (`packages/ui/`)

Declare size **once at the parent of a coherent typography zone**; descendants inherit; override only at the leaf when the visual role demands a different size. This is the same principle as `base.css` at the page level — applied one layer down inside a component.

**Worked example — DS Table.**

```ts
// tableClass — declares 14px as the size contract for the whole table
export const tableClass = "w-full caption-bottom border-collapse typography-body"

// tableHeadVariants base — no size class; headers inherit 14px from <table>
// font-medium + text-muted-foreground distinguish headers visually without changing size
export const tableHeadVariants = cva(
  [
    "sticky top-0 z-table-header",
    "text-left align-middle whitespace-nowrap",
    "font-medium",
    "text-muted-foreground",
    "border-b border-border",
    "first:pl-6 last:pr-6",
  ].join(" "),
  { variants: { density: { default: "min-h-8 py-2 px-3", compact: "min-h-8 py-2 px-3" }, numeric: { true: "text-right", false: "" } }, defaultVariants: { density: "default", numeric: false } }
)

// tableCellVariants base — no size class; cells inherit 14px from <table>
// tableCellVariants.mono — leaf-level override: code/mono fragments render at 12px
export const tableCellVariants = cva(
  ["align-middle font-normal text-foreground whitespace-nowrap", "first:pl-6 last:pr-6"].join(" "),
  {
    variants: {
      density: { default: "py-2 px-3", compact: "py-1.5 px-3" },
      variant: {
        default: "",
        mono: "font-mono typography-code [font-feature-settings:'tnum'_1,'lnum'_1]", // ← leaf override
        truncated: "overflow-hidden text-ellipsis max-w-0",
        "row-action": "text-right w-12",
      },
    },
    defaultVariants: { density: "default", variant: "default" },
  }
)
```

The `mono` variant is the only place a `typography-*` class appears in the base + variant classes — it overrides to `typography-code` (12px, mono role) because that visual role demands a different size. All other variants inherit 14px silently.

**Contrast with the old pattern (removed).** Previously, `tableHeadVariants` declared `typography-label` (12px) on every header and `tableCellVariants` declared `typography-body` (14px) on every cell — one declaration per element, repeated for every row × column. The new pattern declares once at `<table>` and inherits; the only explicit size in descendant variants is the `mono` leaf exception.

**When the rule applies.** Any component that renders a coherent block of content at a consistent size — tables, lists, card bodies, form groups — can apply the same pattern: declare the size at the container, let children inherit, override only where the visual role genuinely differs.

### App layer (`apps/portal/` and future apps)

`body` inherits `typography-body` from `packages/ui/src/styles/base.css`:

```css
body {
  font-size: var(--typography-body);
  /* … */
}
```

At call sites, **do not re-declare `typography-body`**. Add a role utility only when overriding the inherited default — a heading (`typography-display`, `typography-subtitle`), a nav label (`typography-label`), metadata (`typography-meta`), etc.

**Exception — form controls.** `<input>`, `<textarea>`, and `<button>` elements with custom shell styling: the UA stylesheet overrides CSS inheritance for these elements, so `typography-body` is load-bearing and must be declared explicitly.

**Exception — consumer-side table overrides.** A consumer that builds its own raw `<table>` (not via the DS `Table` component) declares `typography-body` on the `<table>` element directly and owns its own `<th>` typography. Consumers using the DS `Table` component inherit the contract automatically from `tableClass`.

---

## Role ≠ size

`typography-label`, `typography-meta`, `typography-code`, `typography-caption` name a typography **role**, not just a pixel size. Two roles may share a metric value; they are not interchangeable.

A nav label rendered at 12px is still a "label" role — use `typography-label`. Do not pick a role utility by pixel match; pick by role intent. The design system evolves role values independently; consumers that aliased by size will drift silently.

**The `mono` variant illustrates this.** `typography-code` is not chosen because it happens to be 12px — it is chosen because the cell renders a code fragment (mono, lnum, tnum), which is the `code` role. If the token value changes, the intent is preserved.

---

## Why we don't use `text-*` for typography

Tailwind's `text-*` namespace is overloaded: it covers color (`text-foreground`), font-size (`text-sm`), alignment (`text-center`), and decoration (`text-underline`). Custom `text-*` typography utilities collided with `text-{color}` inside `cn()` — `tailwind-merge` classified them both as the `font-size` group by default, causing silent class drops.

The `typography-*` namespace removes this collision structurally. `cn.ts` no longer needs `extendTailwindMerge` config; future contributors cannot accidentally re-introduce the silent-drop bug.

---

## Quick reference

| Utility | Size | Typical use |
|---|---|---|
| `typography-display` | 24px | Page / hero headings |
| `typography-subtitle` | 16px | Dialog / drawer / sheet / section headings |
| `typography-body` | 14px | Primary reading size — also the table-level contract |
| `typography-label` | 12px | Form labels, nav labels |
| `typography-caption` | 12px | Supporting labels, metadata |
| `typography-meta` | 10px, mono, uppercase + tracking | Column headers, timestamps, status pips |
| `typography-table-header` | 10px, sans, uppercase + tracking | Table column headers (uppercase, 0.08em tracking) |
| `typography-code` | 12px, mono | Inline / block code fragments — used as leaf override in `tableCellVariants.mono` |

---

## See also

- [`docs/conventions/tailwind-v4.md`](./tailwind-v4.md) — token-form precedence rules (rank 1 utility → rank 2 `prop-(--x)`; rank 3 `[var(--x)]` is never permitted)
- [`docs/design/foundations/spacing.md`](../design/foundations/spacing.md) — spacing canon and composition cheatsheet
