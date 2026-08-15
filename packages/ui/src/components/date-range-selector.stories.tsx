import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { useState } from "react"
import { subDays, subHours, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import { DateRangeSelector } from "./date-range-selector"
import type { DateTimeRange, DateRangeSelectorPreset } from "./date-range-selector"

const NOW = new Date(2026, 5, 19, 14, 30, 0) // June 19, 2026 14:30

function makePresets(now: Date): DateRangeSelectorPreset[] {
  return [
    { label: "Last 6 hours", value: { start: subHours(now, 6), end: now } },
    { label: "Last 12 hours", value: { start: subHours(now, 12), end: now } },
    { label: "Today", value: { start: startOfDay(now), end: endOfDay(now) } },
    { label: "Last 3 days", value: { start: subDays(now, 3), end: now } },
    { label: "Last 7 days", value: { start: subDays(now, 7), end: now } },
    { label: "Last 30 days", value: { start: subDays(now, 30), end: now } },
    { label: "This month", value: { start: startOfMonth(now), end: endOfMonth(now) } },
  ]
}

const PRESETS = makePresets(NOW)

const meta: Meta<typeof DateRangeSelector> = {
  title: "Components/DateRangeSelector",
  component: DateRangeSelector,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Demo wrappers (stateful — controls panel intentionally unused for popover components)
// ---------------------------------------------------------------------------

function PresetMatchedDemo({ initialPresetLabel = "Last 7 days" }: { initialPresetLabel?: string }) {
  const preset = PRESETS.find((p) => p.label === initialPresetLabel) ?? PRESETS[4]!
  const [value, setValue] = useState<DateTimeRange>(preset.value)
  return (
    <DateRangeSelector
      value={value}
      onChange={setValue}
      presets={PRESETS}
      aria-label={`Select date range, current value: ${initialPresetLabel}`}
    >
      {initialPresetLabel}
    </DateRangeSelector>
  )
}

function CustomRangeDemo() {
  const [value, setValue] = useState<DateTimeRange>({
    start: new Date(2026, 5, 10, 0, 0, 0),
    end: new Date(2026, 5, 17, 23, 59, 59),
  })
  return (
    <DateRangeSelector
      value={value}
      onChange={setValue}
      presets={PRESETS}
      aria-label="Select date range, current value: Jun 10 – Jun 17"
    >
      Jun 10 – Jun 17
    </DateRangeSelector>
  )
}

function NoPresetsDemo() {
  const [value, setValue] = useState<DateTimeRange>({
    start: subDays(NOW, 7),
    end: NOW,
  })
  return (
    <DateRangeSelector
      value={value}
      onChange={setValue}
      presets={[]}
      aria-label="Select date range"
    />
  )
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default open state: a preset is matched and highlighted in the preset list. */
export const PresetSelected: Story = {
  render: () => <PresetMatchedDemo />,
}

/** A custom range (no matched preset) — trigger shows the formatted date span. */
export const CustomRange: Story = {
  render: () => <CustomRangeDemo />,
}

/** Disabled trigger — popover cannot be opened. */
export const Disabled: Story = {
  render: () => (
    <DateRangeSelector
      value={{ start: subDays(NOW, 3), end: NOW }}
      onChange={() => {}}
      presets={PRESETS}
      disabled
      aria-label="Select date range, current value: Last 3 days"
    >
      Last 3 days
    </DateRangeSelector>
  ),
}

/** No presets supplied — preset column is absent; only the calendar is shown. */
export const NoPresets: Story = {
  render: () => <NoPresetsDemo />,
}
