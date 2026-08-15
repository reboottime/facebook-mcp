// shadcn-source: radix-wrap:Popover (date+time+timezone range picker; no cmdk/shadcn match for this composite) (n/a, 2026-06-19)
"use client"

import * as React from "react"
import { ClockIcon, CalendarIcon, XIcon } from "lucide-react"

import { Button } from "./button"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import {
  Popover,
  RangeTriggerButton,
  RangePopoverContent,
  FieldLabel,
  useRangePopover,
  fmtDate,
  fmtTime,
  parseTime,
  type DateTimeRange,
  type RangePreset,
} from "./range-popover-base"

export type { RangePreset as DateTimeRangeSelectorPreset }

export type DateTimeRangeSelectorTimezoneOption = {
  label: string
  value: string
}

export interface DateTimeRangeSelectorProps {
  /** Current committed range. */
  value: DateTimeRange
  /** Fires when the user commits a new range (Apply click or preset selection). */
  onChange: (range: DateTimeRange) => void
  /** Consumer-supplied preset list. No hardcoded presets in the DS. */
  presets: RangePreset[]
  /** IANA timezone string. Default "UTC". */
  timezone?: string
  /** Available timezone options. When omitted, timezone is rendered as plain text (no select). */
  timezoneOptions?: DateTimeRangeSelectorTimezoneOption[]
  /** Fires when the user changes the timezone select. */
  onTimezoneChange?: (tz: string) => void
  /**
   * Fires when the user clicks "Remove time". The consumer is responsible for
   * switching to a DateRangeSelector and collapsing the range to day boundaries.
   */
  onRemoveTime?: () => void
  /** Disables the trigger and all interactive elements. */
  disabled?: boolean
  /** Optional className forwarded to the trigger Button. */
  className?: string
  /**
   * Accessible name for the trigger — describes purpose AND current value.
   * e.g. "Select time range, current value: Last 3 days"
   */
  "aria-label"?: string
  /**
   * Visible text inside the trigger button — the formatted range summary.
   * Consumer is responsible for formatting. When omitted the button carries
   * only the calendar icon.
   */
  children?: React.ReactNode
}

const calIcon = <CalendarIcon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
const clockIcon = <ClockIcon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />

const DateTimeRangeSelector = React.forwardRef<HTMLButtonElement, DateTimeRangeSelectorProps>(
  (
    {
      value,
      onChange,
      presets,
      timezone = "UTC",
      timezoneOptions,
      onTimezoneChange,
      onRemoveTime,
      disabled,
      className,
      "aria-label": ariaLabel = "Select time range",
      children,
    },
    ref
  ) => {
    const errorId = React.useId()
    const fromDateId = React.useId()
    const fromTimeId = React.useId()
    const toDateId = React.useId()
    const toTimeId = React.useId()
    const timezoneId = React.useId()

    const {
      open,
      draftStart,
      draftEnd,
      setDraftStart,
      setDraftEnd,
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
    } = useRangePopover({ value, onChange, presets, dateOnly: false })

    // Time input strings are local draft state; they are synced back to draftStart/draftEnd
    // on valid parse. Lazy init from value; reset when popover opens (handleOpenChange resets
    // draftStart/draftEnd, which triggers a new render with updated values here).
    const [fromTimeStr, setFromTimeStr] = React.useState(() => fmtTime(value.start))
    const [toTimeStr, setToTimeStr] = React.useState(() => fmtTime(value.end))

    // When the popover opens, reset the time strings to match the (re-synced) draft dates.
    // We track the `open` state to reset strings on open.
    const prevOpenRef = React.useRef(open)
    if (prevOpenRef.current !== open) {
      prevOpenRef.current = open
      if (open) {
        setFromTimeStr(fmtTime(value.start))
        setToTimeStr(fmtTime(value.end))
      }
    }

    const handleFromTimeChange = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
      setFromTimeStr(ev.target.value)
      const p = parseTime(ev.target.value, draftStart)
      if (p) setDraftStart(p)
    }, [draftStart, setDraftStart])

    const handleToTimeChange = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
      setToTimeStr(ev.target.value)
      const p = parseTime(ev.target.value, draftEnd)
      if (p) setDraftEnd(p)
    }, [draftEnd, setDraftEnd])

    const timeColumn = (
      <div className="flex flex-col gap-4 p-4 min-w-44">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={timezoneId}>Timezone</FieldLabel>
          {timezoneOptions && timezoneOptions.length > 0 ? (
            <Select value={timezone} onValueChange={onTimezoneChange}>
              <SelectTrigger id={timezoneId} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span id={timezoneId} className="typography-body text-foreground">
              {timezone}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={fromDateId}>From</FieldLabel>
            <Input id={fromDateId} value={fmtDate(draftStart)} readOnly trailing={calIcon} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={fromTimeId}>From time</FieldLabel>
            <Input id={fromTimeId} value={fromTimeStr} onChange={handleFromTimeChange} placeholder="HH:MM" trailing={clockIcon} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={toDateId}>To</FieldLabel>
            <Input
              id={toDateId} value={fmtDate(draftEnd)} readOnly trailing={calIcon}
              aria-invalid={isInvalid ? "true" : undefined}
              aria-describedby={isInvalid ? errorId : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={toTimeId}>To time</FieldLabel>
            <Input
              id={toTimeId} value={toTimeStr} onChange={handleToTimeChange} placeholder="HH:MM" trailing={clockIcon}
              aria-invalid={isInvalid ? "true" : undefined}
              aria-describedby={isInvalid ? errorId : undefined}
            />
          </div>
        </div>

        {onRemoveTime && (
          <Button
            variant="ghost"
            onClick={onRemoveTime}
            className="self-start h-auto gap-1 py-1 px-1 text-meta-foreground hover:text-foreground"
          >
            <XIcon className="size-4" aria-hidden="true" />
            Remove time
          </Button>
        )}
      </div>
    )

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
          timeColumn={timeColumn}
        />
      </Popover>
    )
  }
)

DateTimeRangeSelector.displayName = "DateTimeRangeSelector"

export { DateTimeRangeSelector }
