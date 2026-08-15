import * as React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { jest } from "@jest/globals"
import { Combobox, ComboboxTwoLineOption, type ComboboxOption } from "./combobox"

// cmdk calls scrollIntoView when keyboard-navigating items — jsdom does not
// implement it. Stub it globally for this suite.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const SINGLE_OPTIONS: ComboboxOption[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
]

const TWO_LINE_OPTIONS: ComboboxOption[] = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-3", label: "Claude 3" },
]

function ControlledCombobox({
  options = SINGLE_OPTIONS,
  renderOption,
  initialValue = null,
  label,
}: {
  options?: ComboboxOption[]
  renderOption?: (option: ComboboxOption) => React.ReactNode
  initialValue?: string | null
  label?: string
}) {
  const [value, setValue] = React.useState<string | null>(initialValue)
  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Search..."
      renderOption={renderOption}
      label={label}
    />
  )
}

// Open the popover by clicking the combobox trigger.
// Returns the listbox once it appears in the DOM.
async function openCombobox(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("combobox")
  await user.click(trigger)
  return screen.findByRole("listbox")
}

// ── Backward compatibility — single-line path ─────────────────────────────────

describe("Combobox — single-line path (no renderOption)", () => {
  it("renders option labels as accessible option text", async () => {
    const user = userEvent.setup()
    render(<ControlledCombobox />)

    await openCombobox(user)

    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByRole("option", { name: "English" })).toBeInTheDocument()
    expect(within(listbox).getByRole("option", { name: "French" })).toBeInTheDocument()
  })
})

// ── renderOption — custom content lands in the DOM ────────────────────────────

describe("Combobox — renderOption custom renderer", () => {
  it("renders primary and secondary text when renderOption is provided", async () => {
    const user = userEvent.setup()
    render(
      <ControlledCombobox
        options={TWO_LINE_OPTIONS}
        renderOption={(opt) => (
          <ComboboxTwoLineOption
            primary={opt.label}
            secondary={`Secondary for ${opt.label}`}
          />
        )}
      />
    )

    await openCombobox(user)

    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByText("GPT-4o")).toBeInTheDocument()
    expect(within(listbox).getByText("Secondary for GPT-4o")).toBeInTheDocument()
    expect(within(listbox).getByText("Claude 3")).toBeInTheDocument()
    expect(within(listbox).getByText("Secondary for Claude 3")).toBeInTheDocument()
  })
})

// ── Selection commits with renderOption ───────────────────────────────────────

describe("Combobox — selection with renderOption", () => {
  it("fires onValueChange with option.value when a two-line row is clicked", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(
      <Combobox
        options={TWO_LINE_OPTIONS}
        value={null}
        onValueChange={onValueChange as (v: string | null) => void}
        placeholder="Search..."
        renderOption={(opt) => (
          <ComboboxTwoLineOption primary={opt.label} secondary="meta" />
        )}
      />
    )

    await openCombobox(user)

    const listbox = await screen.findByRole("listbox")
    await user.click(within(listbox).getByRole("option", { name: /GPT-4o/ }))

    expect(onValueChange).toHaveBeenCalledWith("gpt-4o")
  })

  it("shows option.label in the trigger after selecting a two-line row", async () => {
    const user = userEvent.setup()
    render(
      <ControlledCombobox
        options={TWO_LINE_OPTIONS}
        renderOption={(opt) => (
          <ComboboxTwoLineOption primary={opt.label} secondary="meta" />
        )}
      />
    )

    await openCombobox(user)

    const listbox = await screen.findByRole("listbox")
    await user.click(within(listbox).getByRole("option", { name: /GPT-4o/ }))

    // Trigger (combobox input) must show the label text, not the rendered JSX subtree
    expect(screen.getByRole("combobox")).toHaveValue("GPT-4o")
  })
})

// ── Keyboard navigation on two-line rows ─────────────────────────────────────

describe("Combobox — keyboard navigation with renderOption", () => {
  it("ArrowDown moves cursor to next item; Enter commits the highlighted two-line option", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(
      <Combobox
        options={TWO_LINE_OPTIONS}
        value={null}
        onValueChange={onValueChange as (v: string | null) => void}
        placeholder="Search..."
        renderOption={(opt) => (
          <ComboboxTwoLineOption primary={opt.label} secondary="meta" />
        )}
      />
    )

    // Click to open; cmdk auto-highlights the first item
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    await screen.findByRole("listbox")

    // ArrowDown moves highlight to the second item (claude-3)
    await user.keyboard("{ArrowDown}")
    await user.keyboard("{Enter}")

    // Confirms the highlighted item is committed
    expect(onValueChange).toHaveBeenCalledWith("claude-3")
  })
})

// ── aria-selected on committed two-line option ────────────────────────────────

describe("Combobox — aria-selected on two-line option", () => {
  it("marks the committed option as aria-selected=true", async () => {
    const user = userEvent.setup()
    render(
      <ControlledCombobox
        options={TWO_LINE_OPTIONS}
        initialValue="gpt-4o"
        renderOption={(opt) => (
          <ComboboxTwoLineOption primary={opt.label} secondary="meta" />
        )}
      />
    )

    // Click to open, then clear the query so all options are visible
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    await user.clear(trigger)

    const listbox = await screen.findByRole("listbox")
    expect(
      within(listbox).getByRole("option", { name: /GPT-4o/ })
    ).toHaveAttribute("aria-selected", "true")
    expect(
      within(listbox).getByRole("option", { name: /Claude 3/ })
    ).toHaveAttribute("aria-selected", "false")
  })
})

// ── ComboboxTwoLineOption helper ──────────────────────────────────────────────

describe("ComboboxTwoLineOption", () => {
  it("renders primary text visibly", () => {
    render(<ComboboxTwoLineOption primary="GPT-4o" secondary="OpenAI · fast" />)
    expect(screen.getByText("GPT-4o")).toBeInTheDocument()
  })

  it("renders secondary text visibly", () => {
    render(<ComboboxTwoLineOption primary="GPT-4o" secondary="OpenAI · fast" />)
    expect(screen.getByText("OpenAI · fast")).toBeInTheDocument()
  })
})

// ── label prop — dimension prefix rendering ───────────────────────────────────

describe("Combobox — label prop", () => {
  it("renders the label text when label is set and no value is selected", () => {
    render(<ControlledCombobox label="Role" />)
    expect(screen.getByText("Role")).toBeInTheDocument()
  })

  it("renders 'Role:' prefix when label is set and a value is selected", () => {
    render(<ControlledCombobox label="Role" initialValue="en" />)
    // The span renders "Role:" (colon only; gap is CSS pr-1)
    expect(screen.getByText("Role:")).toBeInTheDocument()
    // The input carries the selected option label as its value
    expect(screen.getByRole("combobox")).toHaveValue("English")
  })

  it("does not render label text when label prop is omitted (backward compat)", () => {
    render(<ControlledCombobox />)
    // No "Role" label span — query should find no such text
    expect(screen.queryByText("Role")).not.toBeInTheDocument()
  })

  it("label remains visible while typing in the query input", async () => {
    const user = userEvent.setup()
    // Start with no value so label renders without colon
    render(<ControlledCombobox label="Role" />)

    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    // After opening, the label span should still be in the DOM
    expect(screen.getByText("Role")).toBeInTheDocument()
  })
})

// ── clear button — affordance and behavior ────────────────────────────────────

describe("Combobox — clear button", () => {
  it("clear button is not in the DOM when no value is selected", () => {
    render(<ControlledCombobox label="Role" />)
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument()
  })

  it("clear button is in the DOM when a value is selected", () => {
    render(<ControlledCombobox label="Role" initialValue="en" />)
    // Button is mounted but may be visually hidden (opacity-0); query by role finds it
    expect(screen.getByRole("button", { name: "Clear Role" })).toBeInTheDocument()
  })

  it("clear button has correct aria-label when label prop is provided", () => {
    render(<ControlledCombobox label="Role" initialValue="en" />)
    expect(screen.getByRole("button", { name: "Clear Role" })).toBeInTheDocument()
  })

  it("clear button has generic aria-label when no label prop", () => {
    render(<ControlledCombobox initialValue="en" />)
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument()
  })

  it("clicking clear resets the value to null and empties the input", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(
      <Combobox
        options={SINGLE_OPTIONS}
        value="en"
        onValueChange={onValueChange as (v: string | null) => void}
        placeholder="Search..."
        label="Role"
      />
    )

    const clearBtn = screen.getByRole("button", { name: "Clear Role" })
    await user.click(clearBtn)

    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it("clicking clear does not fire onValueChange more than once", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(
      <Combobox
        options={SINGLE_OPTIONS}
        value="en"
        onValueChange={onValueChange as (v: string | null) => void}
        placeholder="Search..."
      />
    )

    const clearBtn = screen.getByRole("button", { name: "Clear selection" })
    await user.click(clearBtn)

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it("clears the input value display after clicking clear", async () => {
    const user = userEvent.setup()
    render(<ControlledCombobox label="Role" initialValue="en" />)

    const clearBtn = screen.getByRole("button", { name: "Clear Role" })
    await user.click(clearBtn)

    expect(screen.getByRole("combobox")).toHaveValue("")
  })
})
