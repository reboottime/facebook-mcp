import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { jest } from "@jest/globals"
import { Calendar } from "./calendar"
import type { DateRange } from "./calendar"

// react-day-picker uses scrollIntoView on keyboard focus — jsdom does not implement it.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * react-day-picker renders a <table role="grid" aria-label="January 2025">.
 * The grid label is the canonical observable for "which month is showing."
 */
function getGridLabel(): string {
  return screen.getByRole("grid").getAttribute("aria-label") ?? ""
}

/**
 * react-day-picker renders each day as:
 *   <td role="gridcell" data-day="2025-01-15" aria-label="Wednesday, January 15th, 2025">
 *     <button type="button">15</button>
 *   </td>
 *
 * The gridcell accessible name varies with mode and controlled-selection state,
 * so we use `data-day` (a public react-day-picker attribute) to locate cells.
 * Clicking the inner <button> is required — clicking <td> does not fire onSelect.
 */
function getDayCell(isoDate: string): HTMLElement {
  const cell = document.querySelector(`[data-day="${isoDate}"]`) as HTMLElement | null
  if (!cell) throw new Error(`No cell found for date: ${isoDate}`)
  return cell
}

function getDayButton(isoDate: string): HTMLElement {
  const cell = getDayCell(isoDate)
  const btn = cell.querySelector("button")
  if (!btn) throw new Error(`No button inside day cell: ${isoDate}`)
  return btn as HTMLElement
}

// ── Month navigation ──────────────────────────────────────────────────────────

describe("Calendar — month navigation", () => {
  it("renders Previous and Next navigation buttons", () => {
    render(<Calendar defaultMonth={new Date(2025, 0, 1)} />)
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
  })

  it("advances to the next month when Next is clicked", async () => {
    const user = userEvent.setup()
    render(<Calendar defaultMonth={new Date(2025, 0, 1)} />)
    expect(getGridLabel()).toMatch(/January 2025/i)
    await user.click(screen.getByRole("button", { name: /next/i }))
    expect(getGridLabel()).toMatch(/February 2025/i)
  })

  it("retreats to the previous month when Previous is clicked", async () => {
    const user = userEvent.setup()
    render(<Calendar defaultMonth={new Date(2025, 5, 1)} />)
    expect(getGridLabel()).toMatch(/June 2025/i)
    await user.click(screen.getByRole("button", { name: /previous/i }))
    expect(getGridLabel()).toMatch(/May 2025/i)
  })
})

// ── Single mode ───────────────────────────────────────────────────────────────

describe("Calendar — single mode", () => {
  it("calls onSelect with the clicked day", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2025, 0, 1)}
        onSelect={onSelect as (d: Date | undefined) => void}
      />
    )
    await user.click(getDayButton("2025-01-15"))
    expect(onSelect).toHaveBeenCalledTimes(1)
    const selected = (onSelect as jest.Mock).mock.calls[0]?.[0] as Date | undefined
    expect(selected?.getDate()).toBe(15)
  })

  it("marks the controlled selected day cell as aria-selected", () => {
    const date = new Date(2025, 0, 10)
    render(
      <Calendar
        mode="single"
        selected={date}
        defaultMonth={date}
      />
    )
    expect(getDayCell("2025-01-10")).toHaveAttribute("aria-selected", "true")
  })
})

// ── Range mode ────────────────────────────────────────────────────────────────

describe("Calendar — range mode", () => {
  it("marks the range start and end cells as aria-selected", () => {
    const range: DateRange = {
      from: new Date(2025, 0, 5),
      to: new Date(2025, 0, 12),
    }
    render(
      <Calendar
        mode="range"
        selected={range}
        defaultMonth={new Date(2025, 0, 1)}
      />
    )
    expect(getDayCell("2025-01-05")).toHaveAttribute("aria-selected", "true")
    expect(getDayCell("2025-01-12")).toHaveAttribute("aria-selected", "true")
  })

  it("calls onSelect when a day is clicked in range mode", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <Calendar
        mode="range"
        defaultMonth={new Date(2025, 0, 1)}
        onSelect={onSelect as (r: DateRange | undefined) => void}
      />
    )
    await user.click(getDayButton("2025-01-08"))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})

// ── Multiple mode ─────────────────────────────────────────────────────────────

describe("Calendar — multiple mode", () => {
  it("calls onSelect when a day is clicked in multiple mode", async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <Calendar
        mode="multiple"
        defaultMonth={new Date(2025, 0, 1)}
        onSelect={onSelect as (d: Date[] | undefined) => void}
      />
    )
    await user.click(getDayButton("2025-01-20"))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})

// ── Today indicator ───────────────────────────────────────────────────────────

describe("Calendar — today indicator", () => {
  // Pin: the td for today must carry the [&>button]:text-primary and
  // [&>button]:font-semibold classes so Tailwind's child-selector rule fires.
  // rdp v10 does NOT add rdp-* prefix classes to user-supplied classNames, so
  // [&>.rdp-day_button] would silently match nothing. [&>button] is the correct
  // selector for the DayButton <button> child element.
  it("applies today emphasis classes to the today grid cell", () => {
    // Use a fixed date so the test is not timezone-sensitive.
    const today = new Date(2025, 0, 15) // Jan 15, 2025
    render(
      <Calendar
        mode="single"
        today={today}
        defaultMonth={today}
      />
    )
    const todayCell = getDayCell("2025-01-15")
    expect(todayCell.className).toContain("[&>button]:text-primary")
    expect(todayCell.className).toContain("[&>button]:font-semibold")
  })

  it("today cell carries data-today attribute", () => {
    const today = new Date(2025, 0, 15)
    render(
      <Calendar
        mode="single"
        today={today}
        defaultMonth={today}
      />
    )
    expect(getDayCell("2025-01-15")).toHaveAttribute("data-today", "true")
  })
})
