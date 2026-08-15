import type { Meta, StoryObj } from "@storybook/react"
import { Info, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"

import { IconButton } from "./icon-button"
import { LedgerCanvas } from "../lib/ledger-preview"

/* ─── Meta ─────────────────────────────────────────────────────────────────── */

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  component: IconButton,
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "destructive", "destructive-ghost"],
    },
    size: {
      control: "select",
      options: ["md", "sm"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "primary",
    size: "md",
    "aria-label": "Add",
    disabled: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

/* ─── Playground ───────────────────────────────────────────────────────────── */

export const Playground: Story = {
  render: (args) => (
    <IconButton {...args}>
      <Plus />
    </IconButton>
  ),
}

/* ─── Variants ─────────────────────────────────────────────────────────────── */
// All variants × sizes × disabled × loading in one view.

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <IconButton variant="primary" aria-label="Add">
          <Plus />
        </IconButton>
        <IconButton variant="secondary" aria-label="Edit">
          <Pencil />
        </IconButton>
        <IconButton variant="ghost" aria-label="Close">
          <X />
        </IconButton>
        <IconButton variant="destructive" aria-label="Delete">
          <Trash2 />
        </IconButton>
        <IconButton variant="destructive-ghost" aria-label="Delete (ghost)">
          <Trash2 />
        </IconButton>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <IconButton variant="ghost" size="md" aria-label="Close">
            <X />
          </IconButton>
          <span className="text-xs text-muted-foreground">32×32</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <IconButton variant="ghost" size="sm" aria-label="Close">
            <X />
          </IconButton>
          <span className="text-xs text-muted-foreground">28×28</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <IconButton variant="primary" aria-label="Add" disabled>
          <Plus />
        </IconButton>
        <IconButton variant="secondary" aria-label="Edit" disabled>
          <Pencil />
        </IconButton>
        <IconButton variant="ghost" aria-label="Close" disabled>
          <X />
        </IconButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <IconButton variant="primary" aria-label="Running…">
          <Loader2 className="animate-spin" />
        </IconButton>
        <IconButton variant="ghost" aria-label="Refreshing…">
          <Loader2 className="animate-spin" />
        </IconButton>
      </div>
    </div>
  ),
}

// ── LedgerTheme ───────────────────────────────────────────────────────────────
// Previews the "kitchen-table ledger" token mapping for the `ghost` variant
// (quiet ink-faint icon at rest, jumps to full ink on hover, warm hover/active
// tints) via the same LedgerCanvas decorator Button/Select/SegmentedControl's
// stories use. Reference: the jobs page info trigger.

export const LedgerTheme: Story = {
  decorators: [(Story) => <LedgerCanvas><Story /></LedgerCanvas>],
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton variant="ghost" aria-label="More info">
        <Info />
      </IconButton>
      <IconButton variant="ghost" size="sm" aria-label="More info">
        <Info />
      </IconButton>
    </div>
  ),
}
