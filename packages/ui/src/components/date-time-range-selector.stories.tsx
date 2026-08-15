import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import { useState } from "react"
import { subDays, subHours, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import { DateTimeRangeSelector } from "./date-time-range-selector"
import type { DateTimeRangeSelectorPreset, DateTimeRangeSelectorTimezoneOption } from "./date-time-range-selector"
import type { DateTimeRange } from "./date-range-selector"

const NOW = new Date(2026, 5, 19, 14, 30, 0) // June 19, 2026 14:30

function makePresets(now: Date): DateTimeRangeSelectorPreset[] {
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

const TIMEZONE_OPTIONS: DateTimeRangeSelectorTimezoneOption[] = [
  { label: "UTC", value: "UTC" },
  { label: "US/Eastern (EST)", value: "America/New_York" },
  { label: "US/Pacific (PST)", value: "America/Los_Angeles" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
]

const meta: Meta<typeof DateTimeRangeSelector> = {
  title: "Components/DateTimeRangeSelector",
  component: DateTimeRangeSelector,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Demo wrappers
// ---------------------------------------------------------------------------

function DateTimeDemo({
  initialPresetLabel = "Last 3 days",
  timezoneOptions = TIMEZONE_OPTIONS,
}: {
  initialPresetLabel?: string
  timezoneOptions?: DateTimeRangeSelectorTimezoneOption[]
}) {
  const preset = PRESETS.find((p) => p.label === initialPresetLabel) ?? PRESETS[3]!
  const [value, setValue] = useState<DateTimeRange>(preset.value)
  const [timezone, setTimezone] = useState("UTC")
  return (
    <DateTimeRangeSelector
      value={value}
      onChange={setValue}
      presets={PRESETS}
      timezone={timezone}
      timezoneOptions={timezoneOptions}
      onTimezoneChange={setTimezone}
      onRemoveTime={() => {
        setValue({ start: startOfDay(value.start), end: endOfDay(value.end) })
      }}
      aria-label={`Select time range, current value: ${initialPresetLabel}`}
    >
      {initialPresetLabel}
    </DateTimeRangeSelector>
  )
}

function InvalidRangeDemo() {
  // Start time forced past end time — the popover will open with an error state.
  const [value, setValue] = useState<DateTimeRange>({
    start: new Date(2026, 5, 15, 23, 0, 0),
    end: new Date(2026, 5, 15, 0, 0, 0),
  })
  const [timezone, setTimezone] = useState("UTC")
  return (
    <DateTimeRangeSelector
      value={value}
      onChange={setValue}
      presets={PRESETS}
      timezone={timezone}
      timezoneOptions={TIMEZONE_OPTIONS}
      onTimezoneChange={setTimezone}
      aria-label="Select time range, invalid range"
    >
      Jun 15 (invalid)
    </DateTimeRangeSelector>
  )
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default: a preset is selected, timezone selector is shown, time inputs are populated. */
export const PresetSelected: Story = {
  render: () => <DateTimeDemo />,
}

/**
 * Timezone displayed as plain text (no timezoneOptions) — the timezone Select is
 * replaced with a read-only label and the "Remove time" button is absent.
 */
export const TimezoneReadOnly: Story = {
  render: () => <DateTimeDemo timezoneOptions={[]} />,
}

/**
 * Invalid range (end before start) — the popover opens showing the error alert
 * and Apply is disabled.
 */
export const InvalidRange: Story = {
  render: () => <InvalidRangeDemo />,
}

/** Disabled trigger — popover cannot be opened. */
export const Disabled: Story = {
  render: () => (
    <DateTimeRangeSelector
      value={{ start: subDays(NOW, 3), end: NOW }}
      onChange={() => {}}
      presets={PRESETS}
      timezone="UTC"
      timezoneOptions={TIMEZONE_OPTIONS}
      onTimezoneChange={() => {}}
      disabled
      aria-label="Select time range, current value: Last 3 days"
    >
      Last 3 days
    </DateTimeRangeSelector>
  ),
}
