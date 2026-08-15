import type { Meta, StoryObj } from "@storybook/react"
import { Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { Button } from "./button"
import { IconButton } from "./icon-button"
import { Input } from "./input"
import { LedgerCanvas } from "../lib/ledger-preview"

/* ─── Meta ─────────────────────────────────────────────────────────────────── */
// Ledger preview: AllVariantsMatrix / LoadingOverlay / FocusBehavior / Playground
// wrap their render output in <LedgerCanvas> (packages/ui/src/lib/ledger-preview.tsx)
// — a per-story decorator that sets the same --color-btn-*/--color-focus CSS custom
// properties apps/portal/src/app/globals.css sets in production, so the ledger look
// (ink/wa-green/warm-canvas) previews here without running the portal app.
// ToolbarAlignment stays on the DS-neutral canvas — it verifies a structural sizing
// invariant (32px baseline across Button/IconButton/Input), not the ledger palette.

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "outline",
        "ghost",
        "accent",
        "accent-soft",
        "secondary",
        "destructive",
        "destructive-ghost",
      ],
    },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    asChild: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: "Button",
    variant: "primary",
    disabled: false,
    loading: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

/* ─── Playground ───────────────────────────────────────────────────────────── */

export const Playground: Story = {
  decorators: [(Story) => <LedgerCanvas><Story /></LedgerCanvas>],
}

/* ─── AllVariantsMatrix ─────────────────────────────────────────────────────── */
// Rows = the five ledger variants, columns = states (enabled / disabled /
// aria-disabled / loading). Lets the operator verify every intersection in one view.

const LEDGER_VARIANTS = [
  "primary",
  "accent",
  "accent-soft",
  "outline",
  "ghost",
] as const

type LedgerVariant = (typeof LEDGER_VARIANTS)[number]

const LEDGER_VARIANT_LABEL: Record<LedgerVariant, string> = {
  primary: "Primary",
  accent: "Accent",
  "accent-soft": "Accent Soft",
  outline: "Outline",
  ghost: "Ghost",
}

export const AllVariantsMatrix: Story = {
  name: "All Variants × States",
  parameters: { layout: "padded" },
  decorators: [(Story) => <LedgerCanvas><Story /></LedgerCanvas>],
  render: () => (
    <div className="flex flex-col gap-2">
      {/* Column headers */}
      <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] gap-3 items-center">
        <span />
        {(["Enabled", "Disabled", "aria-disabled (focusable)", "Loading"] as const).map((col) => (
          <span key={col} className="typography-label text-muted-foreground text-center">
            {col}
          </span>
        ))}
      </div>

      {/* Row separator */}
      <div className="h-px bg-border" />

      {LEDGER_VARIANTS.map((variant) => (
        <div
          key={variant}
          className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] gap-3 items-center py-1"
        >
          <span className="typography-label text-muted-foreground font-mono">
            {LEDGER_VARIANT_LABEL[variant]}
          </span>

          {/* Enabled */}
          <div className="flex justify-center">
            <Button variant={variant}>{LEDGER_VARIANT_LABEL[variant]}</Button>
          </div>

          {/* Native disabled — non-focusable, CSS :disabled */}
          <div className="flex justify-center">
            <Button variant={variant} disabled>
              {LEDGER_VARIANT_LABEL[variant]}
            </Button>
          </div>

          {/* aria-disabled — focusable, onClick suppressed, same visual as disabled */}
          <div className="flex justify-center">
            <Button variant={variant} aria-disabled>
              {LEDGER_VARIANT_LABEL[variant]}
            </Button>
          </div>

          {/* Loading — spinner, aria-disabled + aria-busy, no disabled styling */}
          <div className="flex justify-center">
            <Button variant={variant} loading>
              {LEDGER_VARIANT_LABEL[variant]}
            </Button>
          </div>
        </div>
      ))}
    </div>
  ),
}

/* ─── LoadingOverlay ────────────────────────────────────────────────────────── */
// All ledger variants in loading state side-by-side.
// Key verification: spinner replaces label but button retains its variant colour
// (no grey disabled wash). Contrast this with the disabled column in AllVariantsMatrix.

export const LoadingOverlay: Story = {
  name: "Loading — all variants",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Loading is `busy but valid` — the spinner replaces the label but the button keeps its variant colour. Compare visually with the Disabled column in AllVariantsMatrix to confirm no grey wash is applied.",
      },
    },
  },
  decorators: [(Story) => <LedgerCanvas><Story /></LedgerCanvas>],
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="typography-label text-muted-foreground">
        Loading state — spinner replaces content; variant colour preserved; no disabled grey.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {LEDGER_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} loading aria-label={`${LEDGER_VARIANT_LABEL[variant]} loading`} />
        ))}
      </div>

      {/* Side-by-side comparison: loading vs disabled for primary */}
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="typography-label text-muted-foreground">
          Primary — loading (left) vs disabled (right). Loading keeps the brand fill.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="primary" loading aria-label="Primary loading" />
          <Button variant="primary" disabled>
            Primary disabled
          </Button>
        </div>
      </div>

      {/* Same comparison for accent */}
      <div className="flex flex-col gap-1.5">
        <p className="typography-label text-muted-foreground">
          Accent — loading (left) vs disabled (right). Loading keeps the accent fill.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="accent" loading aria-label="Accent loading" />
          <Button variant="accent" disabled>
            Accent disabled
          </Button>
        </div>
      </div>
    </div>
  ),
}

/* ─── FocusBehavior ─────────────────────────────────────────────────────────── */
// Demonstrates the focusability difference between native disabled and aria-disabled,
// and that the focus ring is the shipped --color-focus outline (blue on this canvas —
// apps/portal/src/app/globals.css overrides --color-focus for the whole app; this
// story mirrors that same override so the ring reads identically here).
// Native disabled: removed from tab order — keyboard users cannot reach it.
// aria-disabled: stays in tab order — focus ring visible; useful for tooltips and
// busy-state announcements.
//
// Operator verification: Tab through this story. You should reach the aria-disabled
// button (second one) but skip the native disabled button (first one).

export const FocusBehavior: Story = {
  name: "Focus — disabled vs aria-disabled",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: [
          "**Native `disabled`** — browser removes the element from the tab order. Keyboard users cannot reach it; no focus ring appears.",
          "",
          "**`aria-disabled` (focusable disabled)** — element stays in the tab order. Focus ring is visible. onClick is suppressed by the component. Use this when a tooltip or screen-reader announcement needs to explain *why* the action is unavailable, or when the button is in a loading state.",
          "",
          "**Tab through this story** to verify: you can focus the `aria-disabled` button (right) but the `disabled` button (left) is skipped. The ring color comes from the shipped `--color-focus` token — untouched by this ledger retheme.",
        ].join("\n"),
      },
    },
  },
  decorators: [(Story) => <LedgerCanvas><Story /></LedgerCanvas>],
  render: () => (
    <div className="flex flex-col gap-6">
      {/* Anchor button before the pair so Tab order is clear */}
      <p className="typography-label text-muted-foreground">
        Tab through the buttons below. The native-disabled button is skipped; the
        aria-disabled button receives focus and shows a focus ring.
      </p>

      <div className="flex items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <Button variant="primary" disabled>
            Native disabled
          </Button>
          <span className="typography-label text-muted-foreground text-center max-w-[140px]">
            Removed from tab order. No focus ring.
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button variant="primary" aria-disabled>
            aria-disabled
          </Button>
          <span className="typography-label text-muted-foreground text-center max-w-[140px]">
            Stays in tab order. Focus ring visible. Click suppressed.
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button variant="primary" loading aria-label="Loading button">
            Loading
          </Button>
          <span className="typography-label text-muted-foreground text-center max-w-[140px]">
            Loading uses aria-disabled. Focusable; spinner replaces label.
          </span>
        </div>
      </div>

      {/* A control button after to make tab order easy to verify */}
      <Button variant="outline" className="self-start">
        Reachable control after
      </Button>
    </div>
  ),
}

/* ─── ToolbarAlignment ──────────────────────────────────────────────────────── */
// Hard alignment rule: Button (32px) + IconButton md (32px) + Input (32px) on one baseline.
// See: .intermediate/design/sizing/primitives-2026-06-08.md §C
// Stays on the DS-neutral canvas (no ledger decorator) — this story verifies a
// structural sizing invariant, not the ledger color palette.

export const ToolbarAlignment: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-6">
      {/* Filter bar — all three primitives at 32px */}
      <div className="flex flex-col gap-1.5">
        <p className="typography-label text-muted-foreground">Toolbar / filter bar — Button + IconButton md + Input (all 32px)</p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search runs…"
            leading={<Search className="size-4 shrink-0 text-muted-foreground" />}
            className="w-64"
          />
          <IconButton variant="ghost" size="md" aria-label="Refresh">
            <RefreshCw />
          </IconButton>
          <IconButton variant="ghost" size="md" aria-label="Clear filter">
            <X />
          </IconButton>
          <Button variant="primary">
            <Plus />
            New Taskset
          </Button>
        </div>
      </div>

      {/* Table row — IconButton sm (24px) inside a fake ~40px row */}
      <div className="flex flex-col gap-1.5">
        <p className="typography-label text-muted-foreground">Table cell — IconButton sm (24px) inside ~40px row</p>
        <div className="border border-border rounded-lg overflow-hidden w-96">
          {["frontier-reasoning-v1", "env-8xkp3-baseline", "rl-train-2026-06-07"].map((name) => (
            <div
              key={name}
              className="flex items-center justify-between h-10 px-3 border-b border-border last:border-b-0 hover:bg-hover-surface"
            >
              <span className="typography-body text-foreground font-mono">{name}</span>
              <div className="flex items-center gap-1">
                <IconButton variant="ghost" size="sm" aria-label={`Copy ID for ${name}`}>
                  <Search className="size-3.5" />
                </IconButton>
                <IconButton variant="destructive-ghost" size="sm" aria-label={`Delete ${name}`}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}
