import type { CSSProperties, ReactNode } from "react"

// Storybook-only preview helper — NOT exported from packages/ui/src/index.ts.
// Mirrors the token mapping apps/portal/src/app/globals.css applies in
// production (Button's --color-btn-* tokens + the form-field --color-field-*/
// --color-form-field-border/--color-field-rest tokens + --color-focus) so
// Storybook can preview the "kitchen-table ledger" look without running the
// portal app. Source of truth for real consumers is globals.css — if that
// mapping changes, update the literals below to match.
//
// STALE AS OF 2026-07-14: packages/ui/src/styles/{primitive,theme}.css now
// defaults to these exact values (DS re-founded on the ledger palette — see
// .intermediate/specs/ds-ledger-default/refound-ds-on-ledger.spec.md).
// LedgerCanvas is now a no-op vs. the unwrapped DS default; kept only so
// existing "-ledger-theme" stories keep rendering while storybook-documenter
// decides whether to collapse them into the (now-identical) plain stories.
type CSSVars = CSSProperties & Record<`--${string}`, string>

export const LEDGER_VARS: CSSVars = {
  // Button
  // Operator decision 2026-07-13: primary === accent (both green) — the
  // ink/black primary read as funeral. This block previously predated that
  // decision (hardcoded ink #2c2820); fixed 2026-07-14 to match
  // apps/portal/globals.css and the new packages/ui DS default.
  "--color-btn-primary": "#1f7a48",
  "--color-btn-primary-hover": "#155d37",
  "--color-btn-primary-foreground": "#ffffff",
  "--color-btn-accent": "#1f7a48",
  "--color-btn-accent-hover": "#155d37",
  "--color-btn-accent-foreground": "#ffffff",
  "--color-btn-accent-soft": "#e6efe4",
  "--color-btn-accent-soft-border": "#1f7a48",
  "--color-btn-accent-soft-border-hover": "#155d37",
  "--color-btn-accent-soft-foreground": "#155d37",
  "--color-btn-outline-border": "#e2d9c4",
  "--color-btn-outline-foreground": "#6b6250",
  "--color-btn-outline-foreground-hover": "#2c2820",
  "--color-btn-outline-hover": "#ece2cd",
  "--color-btn-outline-active": "#e5dabf",
  "--color-btn-ghost-foreground": "#6b6250",
  "--color-btn-ghost-foreground-hover": "#2c2820",
  // IconButton ghost — quiet ink-faint icon, jumps to full ink on hover
  "--color-icon-btn-ghost-foreground": "#9a917c",
  "--color-icon-btn-ghost-foreground-hover": "#2c2820",
  "--color-icon-btn-ghost-hover": "#ece2cd",
  "--color-icon-btn-ghost-active": "#e5dabf",
  // Form fields (Input / Textarea / Select trigger)
  "--color-field-rest": "#fbf7ec",
  "--color-form-field-border": "#e2d9c4",
  "--color-field-foreground": "#2c2820",
  "--color-field-placeholder": "#9a917c",
  // Focus ring — same override the portal already ships globally
  "--color-focus": "#55799a",
  // SegmentedControl — recessed line-soft track + raised cream thumb
  "--color-segmented-thumb": "#fbf7ec",
  "--color-segmented-thumb-foreground": "#2c2820",
  "--color-segmented-track": "#ece4d2",
  "--color-segmented-foreground": "#6b6250",
  "--color-segmented-foreground-hover": "#2c2820",
  "--shadow-segmented-thumb": "0 1px 2px rgba(44, 40, 32, 0.14)",
}

export function LedgerCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ ...LEDGER_VARS, background: "#f4efe3", padding: 24, borderRadius: 8 }}
      data-ledger-preview
    >
      {children}
    </div>
  )
}
