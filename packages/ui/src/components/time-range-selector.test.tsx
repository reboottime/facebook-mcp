import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { jest } from "@jest/globals"
import { DateRangeSelector } from "./date-range-selector"
import type { DateTimeRange, DateRangeSelectorPreset } from "./date-range-selector"
import { DateTimeRangeSelector } from "./date-time-range-selector"
import type { DateTimeRangeSelectorPreset, DateTimeRangeSelectorTimezoneOption } from "./date-time-range-selector"

// react-day-picker / Radix Select call scrollIntoView on focus — jsdom does not implement it.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

const JAN_1 = new Date(2025, 0, 1, 0, 0, 0)
const JAN_7 = new Date(2025, 0, 7, 23, 59, 59)
const DEC_1 = new Date(2024, 11, 1, 0, 0, 0)

const PRESETS: DateRangeSelectorPreset[] = [
  { label: "Last 7 days", value: { start: JAN_1, end: JAN_7 } },
  { label: "Last 30 days", value: { start: DEC_1, end: JAN_7 } },
]

const TIMEZONE_OPTIONS: DateTimeRangeSelectorTimezoneOption[] = [
  { label: "UTC", value: "UTC" },
  { label: "US/Eastern", value: "America/New_York" },
]

interface DateRangeSelectorTestProps {
  value?: DateTimeRange
  onChange?: (r: DateTimeRange) => void
  presets?: DateRangeSelectorPreset[]
  disabled?: boolean
  "aria-label"?: string
  children?: React.ReactNode
}

function renderDateRangeSelector(props: DateRangeSelectorTestProps = {}) {
  const {
    value = { start: JAN_1, end: JAN_7 },
    onChange = jest.fn() as (r: DateTimeRange) => void,
    presets = PRESETS,
    ...rest
  } = props
  return render(
    <DateRangeSelector value={value} onChange={onChange} presets={presets} {...rest} />
  )
}

interface DateTimeRangeSelectorTestProps {
  value?: DateTimeRange
  onChange?: (r: DateTimeRange) => void
  presets?: DateTimeRangeSelectorPreset[]
  timezone?: string
  timezoneOptions?: DateTimeRangeSelectorTimezoneOption[]
  onTimezoneChange?: (tz: string) => void
  onRemoveTime?: () => void
  disabled?: boolean
  "aria-label"?: string
  children?: React.ReactNode
}

function renderDateTimeRangeSelector(props: DateTimeRangeSelectorTestProps = {}) {
  const {
    value = { start: JAN_1, end: JAN_7 },
    onChange = jest.fn() as (r: DateTimeRange) => void,
    presets = PRESETS,
    ...rest
  } = props
  return render(
    <DateTimeRangeSelector value={value} onChange={onChange} presets={presets} {...rest} />
  )
}

/** Open the popover by clicking the trigger button. Returns the dialog element. */
async function openPopover(user: ReturnType<typeof userEvent.setup>, ariaLabel: RegExp) {
  await user.click(screen.getByRole("button", { name: ariaLabel }))
  return screen.findByRole("dialog")
}

describe("DateRangeSelector — trigger", () => {
  it("renders a button with the accessible name from aria-label prop", () => {
    renderDateRangeSelector({ "aria-label": "Select date range, current value: Last 7 days" })
    expect(
      screen.getByRole("button", { name: /select date range, current value: last 7 days/i })
    ).toBeInTheDocument()
  })

  it("renders visible children text inside the trigger when provided", () => {
    renderDateRangeSelector({ children: "Last 7 days" })
    expect(screen.getByRole("button", { name: /select date range/i })).toBeInTheDocument()
    expect(screen.getByText("Last 7 days")).toBeInTheDocument()
  })

  it("opens the dialog popover on click", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await openPopover(user, /select date range/i)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("opens when Enter is pressed on the focused trigger", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    screen.getByRole("button", { name: /select date range/i }).focus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("is disabled and does not open the dialog when disabled prop is set", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector({ disabled: true })
    const trigger = screen.getByRole("button", { name: /select date range/i })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("DateRangeSelector — presets", () => {
  it("shows all consumer-supplied presets as listbox options after opening", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    expect(screen.getByRole("option", { name: "Last 7 days" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Last 30 days" })).toBeInTheDocument()
  })

  it("clicking a preset immediately calls onChange and closes the dialog", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    renderDateRangeSelector({ onChange: onChange as (r: DateTimeRange) => void })
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("option", { name: "Last 7 days" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(PRESETS[0]!.value)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("clicking a different preset calls onChange with that preset's value", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    renderDateRangeSelector({ onChange: onChange as (r: DateTimeRange) => void })
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("option", { name: "Last 30 days" }))
    expect(onChange).toHaveBeenCalledWith(PRESETS[1]!.value)
  })

  it("preset matching current value has aria-selected=true", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector({ value: { start: JAN_1, end: JAN_7 } })
    await openPopover(user, /select date range/i)
    const selectedOption = screen.getByRole("option", { name: "Last 7 days" })
    expect(selectedOption).toHaveAttribute("aria-selected", "true")
    const unselectedOption = screen.getByRole("option", { name: "Last 30 days" })
    expect(unselectedOption).toHaveAttribute("aria-selected", "false")
  })

  it("preset list is a listbox with aria-label 'Presets'", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    expect(screen.getByRole("listbox", { name: /presets/i })).toBeInTheDocument()
  })
})

describe("DateRangeSelector — custom range drawing", () => {
  it("Apply is disabled after the first calendar click (drawing state)", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("button", { name: /January 15/i }))
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled()
  })

  it("Apply is enabled after the second calendar click (complete state)", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("button", { name: /January 15/i }))
    await user.click(screen.getByRole("button", { name: /January 20/i }))
    expect(screen.getByRole("button", { name: /apply/i })).toBeEnabled()
  })

  it("Apply calls onChange with start ≤ end and closes the dialog", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    renderDateRangeSelector({ onChange: onChange as (r: DateTimeRange) => void })
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("button", { name: /January 15/i }))
    await user.click(screen.getByRole("button", { name: /January 20/i }))
    await user.click(screen.getByRole("button", { name: /apply/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const range = (onChange as jest.Mock).mock.calls[0]?.[0] as DateTimeRange
    expect(range.start <= range.end).toBe(true)
    expect(range.end.getDate()).toBe(20)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("DateRangeSelector — cancel", () => {
  it("closes the dialog without calling onChange", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    renderDateRangeSelector({ onChange: onChange as (r: DateTimeRange) => void })
    await openPopover(user, /select date range/i)
    await user.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("DateRangeSelector — live region", () => {
  it("renders a polite live region inside the dialog", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    const dialog = screen.getByRole("dialog")
    const liveRegion = dialog.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})

describe("DateRangeSelector — listbox a11y", () => {
  it("listbox <ul> has tabIndex -1 (entry via roving tabindex on options)", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    const listbox = screen.getByRole("listbox", { name: /presets/i })
    expect(listbox).toHaveAttribute("tabindex", "-1")
  })

  it("active option has tabIndex 0; inactive options have tabIndex -1", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector({ value: { start: JAN_1, end: JAN_7 } })
    await openPopover(user, /select date range/i)
    // The first option (matching value) should be active (tabIndex 0)
    const first = screen.getByRole("option", { name: "Last 7 days" })
    const second = screen.getByRole("option", { name: "Last 30 days" })
    expect(first).toHaveAttribute("tabindex", "0")
    expect(second).toHaveAttribute("tabindex", "-1")
  })

  it("listbox does not have aria-activedescendant (roving DOM focus, not active-descendant)", async () => {
    const user = userEvent.setup()
    renderDateRangeSelector()
    await openPopover(user, /select date range/i)
    const listbox = screen.getByRole("listbox", { name: /presets/i })
    expect(listbox).not.toHaveAttribute("aria-activedescendant")
  })
})

describe("DateTimeRangeSelector — trigger", () => {
  it("renders a button with the accessible name from aria-label prop", () => {
    renderDateTimeRangeSelector({ "aria-label": "Select time range, current value: Last 7 days" })
    expect(
      screen.getByRole("button", { name: /select time range, current value: last 7 days/i })
    ).toBeInTheDocument()
  })

  it("opens the dialog popover on click", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await openPopover(user, /select time range/i)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("is disabled and does not open the dialog when disabled prop is set", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({ disabled: true })
    const trigger = screen.getByRole("button", { name: /select time range/i })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("DateTimeRangeSelector — time inputs", () => {
  it("renders time inputs inside the popover", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({ timezoneOptions: TIMEZONE_OPTIONS })
    await openPopover(user, /select time range/i)
    expect(screen.getByLabelText(/from time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to time/i)).toBeInTheDocument()
  })

  it("renders a timezone combobox when timezoneOptions are provided", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({ timezone: "UTC", timezoneOptions: TIMEZONE_OPTIONS })
    await openPopover(user, /select time range/i)
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("renders timezone as plain text when no timezoneOptions provided", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({ timezone: "UTC" })
    await openPopover(user, /select time range/i)
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getByText("UTC")).toBeInTheDocument()
  })
})

describe("DateTimeRangeSelector — invalid range", () => {
  it("shows an error alert and disables Apply when end < start via time inputs", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({
      value: { start: new Date(2025, 0, 15, 0, 0, 0), end: new Date(2025, 0, 15, 12, 0, 0) },
      timezoneOptions: TIMEZONE_OPTIONS,
    })
    await openPopover(user, /select time range/i)
    const fromTimeInput = screen.getByLabelText(/from time/i)
    await user.clear(fromTimeInput)
    await user.type(fromTimeInput, "23:00")
    const toTimeInput = screen.getByLabelText(/to time/i)
    await user.clear(toTimeInput)
    await user.type(toTimeInput, "00:00")
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled()
  })

  it("associates error message with To-date and To-time inputs via aria-describedby", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector({
      value: { start: new Date(2025, 0, 15, 0, 0, 0), end: new Date(2025, 0, 15, 12, 0, 0) },
      timezoneOptions: TIMEZONE_OPTIONS,
    })
    await openPopover(user, /select time range/i)
    const fromTimeInput = screen.getByLabelText(/from time/i)
    await user.clear(fromTimeInput)
    await user.type(fromTimeInput, "23:00")
    const toTimeInput = screen.getByLabelText(/to time/i)
    await user.clear(toTimeInput)
    await user.type(toTimeInput, "00:00")

    const alert = await screen.findByRole("alert")
    const alertId = alert.getAttribute("id")
    expect(alertId).toBeTruthy()
    expect(toTimeInput).toHaveAttribute("aria-describedby", alertId)
    expect(toTimeInput).toHaveAttribute("aria-invalid", "true")

    const toDateInput = screen.getByLabelText(/^to$/i)
    expect(toDateInput).toHaveAttribute("aria-describedby", alertId)
    expect(toDateInput).toHaveAttribute("aria-invalid", "true")
  })
})

describe("DateTimeRangeSelector — timezone", () => {
  it("calls onTimezoneChange with the selected timezone value", async () => {
    const user = userEvent.setup()
    const onTimezoneChange = jest.fn()
    renderDateTimeRangeSelector({
      timezone: "UTC",
      timezoneOptions: TIMEZONE_OPTIONS,
      onTimezoneChange: onTimezoneChange as (tz: string) => void,
    })
    await openPopover(user, /select time range/i)
    await user.click(screen.getByRole("combobox"))
    await screen.findByRole("listbox")
    await user.click(screen.getByRole("option", { name: "US/Eastern" }))
    expect(onTimezoneChange).toHaveBeenCalledWith("America/New_York")
  })
})

describe("DateTimeRangeSelector — cancel", () => {
  it("closes the dialog without calling onChange", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    renderDateTimeRangeSelector({ onChange: onChange as (r: DateTimeRange) => void })
    await openPopover(user, /select time range/i)
    await user.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("DateTimeRangeSelector — live region", () => {
  it("renders a polite live region inside the dialog", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector()
    await openPopover(user, /select time range/i)
    const dialog = screen.getByRole("dialog")
    const liveRegion = dialog.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})

describe("DateTimeRangeSelector — listbox a11y", () => {
  it("listbox <ul> has tabIndex -1 (entry via roving tabindex on options)", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector()
    await openPopover(user, /select time range/i)
    const listbox = screen.getByRole("listbox", { name: /presets/i })
    expect(listbox).toHaveAttribute("tabindex", "-1")
  })

  it("listbox does not have aria-activedescendant", async () => {
    const user = userEvent.setup()
    renderDateTimeRangeSelector()
    await openPopover(user, /select time range/i)
    const listbox = screen.getByRole("listbox", { name: /presets/i })
    expect(listbox).not.toHaveAttribute("aria-activedescendant")
  })
})
