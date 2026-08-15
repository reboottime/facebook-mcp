// shadcn-source: radix-wrap:react-day-picker (shadcn has no calendar primitive; react-day-picker is the ecosystem standard) (n/a, 2026-06-19)
"use client"

import * as React from "react"
import { DayPicker, useDayPicker } from "react-day-picker"
import type { DateRange, DayPickerProps, CustomComponents, MonthCaptionProps } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@repo/ui/lib/cn"
import { buttonBaseClasses } from "./button-base"

export type { DateRange }

export type CalendarProps = DayPickerProps & {
  className?: string
}

// Extracted to a named function to avoid the react/prop-types ESLint warning
// that fires on inline arrow functions inside components.

type ChevronProps = Parameters<NonNullable<CustomComponents["Chevron"]>>[0]

function CalendarChevron({ orientation }: ChevronProps) {
  return orientation === "left" ? (
    <ChevronLeftIcon className="size-4" aria-hidden="true" />
  ) : (
    <ChevronRightIcon className="size-4" aria-hidden="true" />
  )
}

// rdp v10 renders Nav as a sibling of .rdp-months at the .rdp-root level (not
// inside .rdp-month_caption), positioned absolutely. We suppress that Nav and
// instead compose [prev] [label] [next] inline inside a custom MonthCaption so
// the chevrons flank the month label in a single flex row.
//
// Multi-month note: each month caption renders independently. We show the prev
// button only on the first caption (displayIndex 0) and the next button only on
// the last caption (displayIndex === months.length - 1). An invisible placeholder
// holds the space on the side that has no button so the label stays centered.
function CalendarMonthCaption({ calendarMonth, displayIndex, ...divProps }: MonthCaptionProps) {
  const {
    months,
    previousMonth,
    nextMonth,
    goToMonth,
    labels: { labelPrevious, labelNext },
    formatters: { formatCaption },
    classNames,
  } = useDayPicker()

  const isFirst = displayIndex === 0
  const isLast = displayIndex === months.length - 1

  return (
    <div {...divProps} className={cn("flex items-center justify-between px-1 pt-1", divProps.className)}>
      {isFirst ? (
        <button
          type="button"
          aria-label={labelPrevious(previousMonth)}
          aria-disabled={previousMonth ? undefined : true}
          tabIndex={previousMonth ? undefined : -1}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          className={classNames["button_previous"]}
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </button>
      ) : (
        // Invisible spacer preserves label centering in multi-month layout.
        <span className="size-7" aria-hidden="true" />
      )}

      <span
        role="status"
        aria-live="polite"
        className={classNames["caption_label"]}
      >
        {formatCaption(calendarMonth.date)}
      </span>

      {isLast ? (
        <button
          type="button"
          aria-label={labelNext(nextMonth)}
          aria-disabled={nextMonth ? undefined : true}
          tabIndex={nextMonth ? undefined : -1}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          className={classNames["button_next"]}
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </button>
      ) : (
        // Invisible spacer preserves label centering in multi-month layout.
        <span className="size-7" aria-hidden="true" />
      )}
    </div>
  )
}

// Focus rings: DayPicker manages focus internally via DayFlag.focused — it adds
// a `rdp-focused` class to the `.day` wrapper when a day button is keyboard-focused.
// The global `*:focus-visible` rule in base.css fires on the focused `day_button`
// element directly, which is the correct behavior. We do NOT suppress it here.
// Instead we use `focus-inset` on the Calendar root so that the ring paints
// inset (the calendar lives inside a Popover with overflow:hidden — an outer
// box-shadow would clip). The `focused` classNames entry below is NOT needed
// for the focus ring (base.css already handles it); it is kept to match the
// DayPicker API surface and document the decision.

const dayButtonBase = [
  "relative flex size-8 items-center justify-center",
  "rounded-md",
  "typography-body text-foreground",
  "transition-colors duration-fast ease-out-standard",
  "cursor-pointer select-none",
  // Forced-colors (Windows HC) fallback — preserves outline when box-shadow is ignored.
  "forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-current",
].join(" ")

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays
      // focus-inset: Calendar lives inside overflow:hidden Popover — use inset ring
      // so the focus indicator isn't clipped. base.css .focus-inset *:focus-visible
      // handles the paint; no per-component focus-visible override needed here.
      className={cn("w-fit focus-inset", className)}
      classNames={{
        root: "select-none",
        months: "flex gap-4",
        month: "flex flex-col gap-4",
        // month_caption layout is owned by CalendarMonthCaption custom component.
        month_caption: "",
        caption_label: "typography-body font-medium text-foreground",
        button_previous: cn(
          buttonBaseClasses,
          "size-7 p-0 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-hover-surface",
          "disabled:opacity-mid disabled:pointer-events-none",
        ),
        button_next: cn(
          buttonBaseClasses,
          "size-7 p-0 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-hover-surface",
          "disabled:opacity-mid disabled:pointer-events-none",
        ),
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: [
          "w-8 text-center",
          "typography-meta text-meta-foreground font-normal",
          "pb-1",
        ].join(" "),
        weeks: "flex flex-col gap-px",
        week: "flex",
        day: [
          "relative flex items-center justify-center",
          "w-8",
        ].join(" "),
        day_button: cn(dayButtonBase, "hover:bg-hover-surface"),
        range_start: [
          "rounded-l-md",
          "bg-primary-soft",
          // [&>button] targets the DayButton <button> child — rdp v10 does not add
          // rdp-* prefix classes to user-supplied className strings, so
          // [&>.rdp-day_button] would never match. Use the element selector instead.
          // bg-primary-border (25% orange mix) keeps the endpoint in the same warm
          // family as range_middle (bg-primary-soft, 10% orange mix) in both themes.
          // ! (important) is intentional: rdp applies both `range_start` and
          // `selected` classNames to endpoint days. `selected` sets
          // [&>button]:bg-selected-surface; since Tailwind resolves same-specificity
          // utilities by stylesheet order, bg-selected-surface can win in dark mode
          // (its dark mapping resolves to a cool neutral). The ! prefix pins the
          // endpoint bg to the warm primary family in every theme, without touching
          // the `selected` className which must stay for single-mode days.
          "[&>button]:!bg-primary-border [&>button]:rounded-md",
        ].join(" "),
        range_end: [
          "rounded-r-md",
          "bg-primary-soft",
          // Same rationale as range_start above — ! pins the warm bg against
          // the `selected` override in dark mode.
          "[&>button]:!bg-primary-border [&>button]:rounded-md",
        ].join(" "),
        range_middle: [
          "bg-primary-soft rounded-none",
          // hover-surface overlaid on primary-soft gives a distinct in-range hover signal.
          "[&>button]:bg-transparent [&>button]:rounded-none [&>button]:hover:bg-hover-surface",
        ].join(" "),
        selected: "[&>button]:bg-selected-surface",
        today: "[&>button]:font-semibold [&>button]:text-primary",
        outside: "[&>button]:text-meta-foreground [&>button]:opacity-mid",
        disabled: "[&>button]:text-text-disabled [&>button]:pointer-events-none",
        // focused: DayPicker adds this class to the .day wrapper on keyboard focus.
        // The focus ring is painted by base.css *:focus-visible on the child day_button.
        // No override needed — this entry is a no-op kept for API documentation clarity.
        focused: "",
        hidden: "invisible",
      }}
      components={{
        Chevron: CalendarChevron,
        MonthCaption: CalendarMonthCaption,
        // Nav: suppressed — CalendarMonthCaption renders prev/next inline.
        // Empty Fragment mounts no DOM (same effective behavior as null) and
        // satisfies the slot's Element return type — DayPicker's component
        // signature rejects null under strict-null checks.
        Nav: () => <></>,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
