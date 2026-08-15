// shadcn-source: radix-wrap:Popover (date-only range picker; no cmdk/shadcn match for this composite) (n/a, 2026-06-19)
"use client"

import * as React from "react"

import {
  Popover,
  RangeTriggerButton,
  RangePopoverContent,
  useRangePopover,
  type DateTimeRange,
  type RangePreset,
} from "./range-popover-base"

// DateTimeRange and RangePreset are canonical shared types exported from this module.
// DateTimeRangeSelectorPreset is an alias for consumers who prefer the fully-qualified name.
export type { DateTimeRange, RangePreset, RangePreset as DateRangeSelectorPreset }

export interface DateRangeSelectorProps {
  /** Current committed range. */
  value: DateTimeRange
  /** Fires when the user commits a new range (Apply click or preset selection). */
  onChange: (range: DateTimeRange) => void
  /** Consumer-supplied preset list. No hardcoded presets in the DS. */
  presets: RangePreset[]
  /** Disables the trigger and all interactive elements. */
  disabled?: boolean
  /** Optional className forwarded to the trigger Button. */
  className?: string
  /**
   * Accessible name for the trigger — describes purpose AND current value.
   * e.g. "Select date range, current value: Last 7 days"
   */
  "aria-label"?: string
  /**
   * Visible text inside the trigger button — the formatted range summary.
   * Consumer is responsible for formatting. When omitted the button carries
   * only the calendar icon.
   */
  children?: React.ReactNode
}

const DateRangeSelector = React.forwardRef<HTMLButtonElement, DateRangeSelectorProps>(
  (
    {
      value,
      onChange,
      presets,
      disabled,
      className,
      "aria-label": ariaLabel = "Select date range",
      children,
    },
    ref
  ) => {
    const errorId = React.useId()

    const {
      open,
      draftStart,
      presetListRef,
      handleOpenChange,
      matchedPreset,
      handlePresetSelect,
      handleCalendarSelect,
      isInvalid,
      applyDisabled,
      handleApply,
      handleCancel,
      calendarSelected,
      liveMessage,
      handleAutoFocus,
    } = useRangePopover({ value, onChange, presets, dateOnly: true })

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <RangeTriggerButton
          triggerRef={ref}
          disabled={disabled}
          className={className}
          ariaLabel={ariaLabel}
        >
          {children}
        </RangeTriggerButton>

        <RangePopoverContent
          presets={presets}
          selectedPresetLabel={matchedPreset?.label}
          onPresetSelect={handlePresetSelect}
          listRef={presetListRef}
          calendarSelected={calendarSelected}
          onCalendarSelect={handleCalendarSelect}
          draftStart={draftStart}
          isInvalid={isInvalid}
          errorId={errorId}
          liveMessage={liveMessage}
          applyDisabled={applyDisabled}
          onCancel={handleCancel}
          onApply={handleApply}
          onOpenAutoFocus={handleAutoFocus}
          ariaLabel={ariaLabel}
        />
      </Popover>
    )
  }
)

DateRangeSelector.displayName = "DateRangeSelector"

export { DateRangeSelector }
