import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "./badge"

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "success", "running", "info", "beta", "warning", "destructive", "brand-soft"],
    },
    size: {
      control: "select",
      options: ["md", "sm"],
    },
    showDot: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: "Badge",
    variant: "neutral",
    size: "md",
    showDot: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ── Playground ────────────────────────────────────────────────────────────────
export const Playground: Story = {}

// ── Variants ──────────────────────────────────────────────────────────────────
// All variants × sizes × dot states grouped.
export const Variants: Story = {
  args: {
    showDot: true
  },

  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="beta">Beta</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="running">Running</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="brand-soft">Brand Soft</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge variant="success" showDot>Scored</Badge>
        <Badge variant="running" showDot>Running</Badge>
        <Badge variant="warning" showDot>Warning</Badge>
        <Badge variant="destructive" showDot>Errored</Badge>
      </div>
    </div>
  )
}

// ── Size matrix ───────────────────────────────────────────────────────────────
// All variants at sm and md — confirms dot centering and chip height at both sizes.
export const SizeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(["md", "sm"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          <p className="font-mono text-xs text-muted-foreground">size=&quot;{size}&quot;</p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral" size={size}>Neutral</Badge>
            <Badge variant="info" size={size}>Info</Badge>
            <Badge variant="beta" size={size}>Beta</Badge>
            <Badge variant="success" size={size} showDot>Success</Badge>
            <Badge variant="running" size={size} showDot>Running</Badge>
            <Badge variant="warning" size={size} showDot>Warning</Badge>
            <Badge variant="destructive" size={size} showDot>Destructive</Badge>
            <Badge variant="brand-soft" size={size}>Tier 0</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
