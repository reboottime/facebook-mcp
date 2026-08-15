// shadcn-source: radix-wrap:Popover (shared private subcomponent for DateRangeSelector + DateTimeRangeSelector) (n/a, 2026-06-19)
"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@repo/ui/lib/cn"
import { Button } from "./button"
import { Calendar } from "./calendar"
import type { DateRange } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Separator } from "./separator"
import { CalendarIcon } from "lucide-react"

export type DateTimeRange = {
  start: Date
  end: Date
}

export type RangePreset = {
  label: string
  value: DateTimeRange
}

export type DrawState =
  | { kind: "idle" }
  | { kind: "drawing"; start: Date }
  | { kind: "complete"; start: Date; end: Date }

export const fmtDate = (d: Date) => format(d, "MMM d")
export const fmtTime = (d: Date) => format(d, "HH:mm")
export const fmtDateLong = (d: Date) => format(d, "MMM d, yyyy")

export function parseTime(str: string, base: Date): Date | null {
  const m = str.match(/^(\d{1,2}):(\d{2})$/)
  if (!m || !m[1] || !m[2]) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (h > 23 || mm > 59) return null
  const d = new Date(base)
  d.setHours(h, mm, 0, 0)
  return d
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

interface PresetListProps {
  presets: RangePreset[]
  selectedLabel: string | undefined
  onSelect: (preset: RangePreset) => void
  listRef: React.RefObject<HTMLUListElement | null>
}

export function PresetList({ presets, selectedLabel, onSelect, listRef }: PresetListProps) {
  // Lazy-init active index to the currently-selected preset (or 0).
  const [activeIndex, setActiveIndex] = React.useState<number>(() => {
    const idx = presets.findIndex((p) => p.label === selectedLabel)
    return idx >= 0 ? idx : 0
  })

  // When the prop-driven selected label changes (e.g. popover reopened with a
  // different external value), re-sync via ref comparison — avoid an effect
  // that fires on every render.
  const prevSelectedRef = React.useRef(selectedLabel)
  if (prevSelectedRef.current !== selectedLabel) {
    prevSelectedRef.current = selectedLabel
    const idx = presets.findIndex((p) => p.label === selectedLabel)
    const next = idx >= 0 ? idx : 0
    if (next !== activeIndex) setActiveIndex(next)
  }

  // Roving DOM focus: move actual focus to the active <li> when the user
  // navigates via keyboard AND focus is already inside the list.
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (focusedIndex === null) return
    const list = listRef.current
    if (!list) return
    const items = list.querySelectorAll<HTMLLIElement>('[role="option"]')
    const target = items[focusedIndex]
    if (target) target.focus()
  }, [focusedIndex, listRef])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        const next = (activeIndex + 1) % presets.length
        setActiveIndex(next)
        setFocusedIndex(next)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const next = (activeIndex - 1 + presets.length) % presets.length
        setActiveIndex(next)
        setFocusedIndex(next)
      } else if (e.key === "Home") {
        e.preventDefault()
        setActiveIndex(0)
        setFocusedIndex(0)
      } else if (e.key === "End") {
        e.preventDefault()
        const last = presets.length - 1
        setActiveIndex(last)
        setFocusedIndex(last)
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const preset = presets[activeIndex]
        if (preset) onSelect(preset)
      }
    },
    [presets, activeIndex, onSelect]
  )

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Presets"
      tabIndex={-1}
      // why: outline-none on the <ul> is intentional — the list is the roving-focus
      // container but is never the visible focus target; individual <li role="option">
      // elements receive focus via roving tabindex. The global focus-inset rule
      // (base.css) paints the ring on each <li>. HC-mode fallback is covered by
      // forced-colors:focus-visible:outline on the <li> items.
      className="flex flex-col p-1 min-w-40 outline-none focus-inset"
      onKeyDown={handleKeyDown}
    >
      {presets.map((preset, idx) => {
        const isSelected = selectedLabel === preset.label
        const isActive = activeIndex === idx
        return (
          <li
            key={preset.label}
            id={`preset-item-${idx}`}
            role="option"
            aria-selected={isSelected}
            tabIndex={isActive ? 0 : -1}
            data-focused={focusedIndex === idx ? "true" : undefined}
            onClick={() => {
              setActiveIndex(idx)
              onSelect(preset)
            }}
            onFocus={() => setActiveIndex(idx)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={cn(
              "relative flex cursor-default select-none items-center gap-2",
              "rounded-md px-2 py-1.5 typography-body text-foreground outline-none focus-inset",
              "hover:bg-highlight-surface aria-selected:font-medium",
              "data-[focused=true]:bg-highlight-surface",
            )}
          >
            <CheckIcon
              className={cn("size-4 shrink-0", isSelected ? "text-primary opacity-100" : "opacity-0")}
              aria-hidden="true"
            />
            {preset.label}
          </li>
        )
      })}
    </ul>
  )
}

export interface RangePopoverContentProps {
  presets: RangePreset[]
  selectedPresetLabel: string | undefined
  onPresetSelect: (preset: RangePreset) => void
  listRef: React.RefObject<HTMLUListElement | null>
  calendarSelected: DateRange | undefined
  onCalendarSelect: (range: DateRange | undefined) => void
  draftStart: Date
  isInvalid: boolean
  errorId: string
  liveMessage: string
  applyDisabled: boolean
  onCancel: () => void
  onApply: () => void
  onOpenAutoFocus: (e: Event) => void
  ariaLabel: string
  timeColumn?: React.ReactNode
}

export function RangePopoverContent({
  presets,
  selectedPresetLabel,
  onPresetSelect,
  listRef,
  calendarSelected,
  onCalendarSelect,
  draftStart,
  isInvalid,
  errorId,
  liveMessage,
  applyDisabled,
  onCancel,
  onApply,
  onOpenAutoFocus,
  ariaLabel,
  timeColumn,
}: RangePopoverContentProps) {
  return (
    <PopoverContent
      variant="filter"
      align="start"
      className="min-w-fit max-w-none p-0"
      aria-label={ariaLabel}
      role="dialog"
      onOpenAutoFocus={onOpenAutoFocus}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      <div className="flex">
        <div className="flex flex-col p-4">
          <PresetList
            presets={presets}
            selectedLabel={selectedPresetLabel}
            onSelect={onPresetSelect}
            listRef={listRef}
          />
        </div>

        <Separator orientation="vertical" className="h-auto" />

        <div className="flex flex-col gap-4 p-4">
          <Calendar
            mode="range"
            selected={calendarSelected}
            onSelect={onCalendarSelect}
            defaultMonth={draftStart}
            numberOfMonths={1}
          />
          {isInvalid && (
            <p id={errorId} role="alert" className="typography-label text-state-errored-text">
              End must be after start
            </p>
          )}
        </div>

        {timeColumn != null && (
          <>
            <Separator orientation="vertical" className="h-auto" />
            {timeColumn}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onApply} disabled={applyDisabled}>Apply</Button>
      </div>
    </PopoverContent>
  )
}

export interface UseRangePopoverOptions {
  value: DateTimeRange
  onChange: (range: DateTimeRange) => void
  presets: RangePreset[]
  dateOnly: boolean
}

export function useRangePopover({ value, onChange, presets, dateOnly }: UseRangePopoverOptions) {
  const [open, setOpen] = React.useState(false)
  const [draftStart, setDraftStart] = React.useState<Date>(value.start)
  const [draftEnd, setDraftEnd] = React.useState<Date>(value.end)
  const [drawState, setDrawState] = React.useState<DrawState>({ kind: "idle" })

  const presetListRef = React.useRef<HTMLUListElement>(null)

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (next) {
      setDraftStart(value.start)
      setDraftEnd(value.end)
      setDrawState({ kind: "idle" })
    }
    setOpen(next)
  }, [value])

  const matchedPreset = React.useMemo(
    () => presets.find(
      (p) => p.value.start.getTime() === value.start.getTime()
        && p.value.end.getTime() === value.end.getTime()
    ),
    [presets, value]
  )

  const handlePresetSelect = React.useCallback((preset: RangePreset) => {
    onChange(preset.value)
    setOpen(false)
  }, [onChange])

  const handleCalendarSelect = React.useCallback(
    (range: DateRange | undefined) => {
      if (!range) return
      if (drawState.kind === "idle" || drawState.kind === "complete") {
        if (range.from) {
          setDrawState({ kind: "drawing", start: range.from })
          setDraftStart(range.from)
          setDraftEnd(range.from)
        }
      } else if (drawState.kind === "drawing") {
        const start = drawState.start
        const rawEnd = range.to ?? range.from ?? start
        const end = sameDay(start, rawEnd) && dateOnly
          ? new Date(new Date(start).setHours(23, 59, 59, 999))
          : rawEnd
        const [s, e] = end < start ? [end, start] : [start, end]
        setDraftStart(s)
        setDraftEnd(e)
        setDrawState({ kind: "complete", start: s, end: e })
      }
    },
    [drawState, dateOnly]
  )

  const isDrawing = drawState.kind === "drawing"
  const isInvalid = draftEnd < draftStart
  const applyDisabled = isDrawing || isInvalid

  const handleApply = React.useCallback(() => {
    if (applyDisabled) return
    onChange({ start: draftStart, end: draftEnd })
    setOpen(false)
  }, [applyDisabled, onChange, draftStart, draftEnd])

  const handleCancel = React.useCallback(() => setOpen(false), [])

  const calendarSelected: DateRange | undefined = drawState.kind === "drawing"
    ? { from: drawState.start, to: undefined }
    : { from: draftStart, to: draftEnd }

  const liveMessage = React.useMemo(() => {
    if (drawState.kind === "drawing") {
      return `Start date ${fmtDateLong(drawState.start)} selected. Choose end date.`
    }
    if (drawState.kind === "complete") {
      return `Range ${fmtDateLong(drawState.start)} to ${fmtDateLong(drawState.end)} selected. Press Apply.`
    }
    if (isInvalid) {
      return "End must be after start."
    }
    return ""
  }, [drawState, isInvalid])

  const handleAutoFocus = React.useCallback((e: Event) => {
    e.preventDefault()
    presetListRef.current?.focus()
  }, [])

  return {
    open,
    setOpen,
    draftStart,
    setDraftStart,
    draftEnd,
    setDraftEnd,
    drawState,
    presetListRef,
    handleOpenChange,
    matchedPreset,
    handlePresetSelect,
    handleCalendarSelect,
    isDrawing,
    isInvalid,
    applyDisabled,
    handleApply,
    handleCancel,
    calendarSelected,
    liveMessage,
    handleAutoFocus,
  }
}

export interface RangeTriggerButtonProps {
  triggerRef: React.Ref<HTMLButtonElement>
  disabled?: boolean
  className?: string
  ariaLabel: string
  children?: React.ReactNode
}

export function RangeTriggerButton({ triggerRef, disabled, className, ariaLabel, children }: RangeTriggerButtonProps) {
  return (
    <PopoverTrigger asChild>
      <Button
        ref={triggerRef}
        variant="secondary"
        disabled={disabled}
        className={cn("gap-2", className)}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
      >
        <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        {children != null ? (
          <span aria-hidden="true">{children}</span>
        ) : null}
      </Button>
    </PopoverTrigger>
  )
}

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="typography-label font-medium text-meta-foreground uppercase">
      {children}
    </label>
  )
}

// Re-export Popover so top-level components don't need to re-import it
export { Popover }
