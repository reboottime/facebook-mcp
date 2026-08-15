import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { useState } from "react"
import { Calendar } from "./calendar"
import type { DateRange } from "./calendar"

const TODAY = new Date(2026, 5, 19)

// Decorator mimics the popover surface Calendar is designed to render inside.
// Calendar is leaf-clean (no chrome of its own) — applying the surface here
// gives an accurate visual impression without double-bordering in the real popover.
const popoverSurface = (Story: React.ComponentType) => (
  <div className="bg-popover text-popover-foreground rounded-lg border border-border shadow-popover p-3 w-fit">
    <Story />
  </div>
)

const meta = {
  title: "Components/Calendar",
  component: Calendar,
  decorators: [popoverSurface],
  parameters: { layout: "centered" },
  argTypes: {
    showOutsideDays: { control: "boolean" },
    numberOfMonths: { control: { type: "number", min: 1, max: 3 } },
  },
  args: {
    showOutsideDays: true,
    numberOfMonths: 1,
  },
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

// ── Playground ────────────────────────────────────────────────────────────────
// Single-mode playground — args control showOutsideDays and numberOfMonths.
// Switch modes via the named stories below for type-safe interactive demos.

function PlaygroundDemo(args: { showOutsideDays?: boolean; numberOfMonths?: number }) {
  const [selected, setSelected] = useState<Date | undefined>(TODAY)
  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={setSelected}
      defaultMonth={TODAY}
      showOutsideDays={args.showOutsideDays}
      numberOfMonths={args.numberOfMonths}
    />
  )
}

export const Playground: Story = {
  render: (args) => <PlaygroundDemo showOutsideDays={args.showOutsideDays} numberOfMonths={args.numberOfMonths} />,
}

// ── Mode stories ──────────────────────────────────────────────────────────────

function RangeDemo() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 5, 15),
    to: new Date(2026, 5, 19),
  })
  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={setRange}
      defaultMonth={TODAY}
    />
  )
}

export const RangeSelection: Story = {
  render: () => <RangeDemo />,
}

// Range with `to` undefined — the in-progress "mid-draw" state where the user
// has picked a start date but not yet committed an end date. The range highlight
// renders as a single-day selected cap with no fill extending right.
export const RangeMidDraw: Story = {
  render: () => (
    <Calendar
      mode="range"
      selected={{ from: new Date(2026, 5, 15), to: undefined }}
      onSelect={() => {}}
      defaultMonth={TODAY}
    />
  ),
}

// Two-month layout: demonstrates the multi-month grid and the chevron placement
// rule (prev only on first caption, next only on last). Range spanning a month
// boundary shows the bg-primary-soft fill crossing the gap.
function TwoMonthsDemo() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 5, 25),
    to: new Date(2026, 6, 5),
  })
  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={setRange}
      defaultMonth={new Date(2026, 5, 1)}
      numberOfMonths={2}
    />
  )
}

export const TwoMonths: Story = {
  render: () => <TwoMonthsDemo />,
}
