import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { jest } from "@jest/globals"
import { Button } from "./button"

describe("Button", () => {
  // ── Native disabled state ──────────────────────────────────────────────────

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled()
  })

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    await user.click(screen.getByRole("button", { name: "Disabled" }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  // ── aria-disabled focusable state ──────────────────────────────────────────

  it("is not natively disabled when aria-disabled is true", () => {
    render(<Button aria-disabled>Aria disabled</Button>)
    const btn = screen.getByRole("button", { name: "Aria disabled" })
    expect(btn).not.toBeDisabled()
    expect(btn).toHaveAttribute("aria-disabled", "true")
  })

  it("suppresses onClick when aria-disabled is true", async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button aria-disabled onClick={handleClick}>Aria disabled</Button>)
    await user.click(screen.getByRole("button", { name: "Aria disabled" }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("remains focusable (not natively disabled) when aria-disabled is true", () => {
    render(<Button aria-disabled>Aria disabled</Button>)
    const btn = screen.getByRole("button", { name: "Aria disabled" })
    expect(btn).not.toBeDisabled()
    expect(btn).not.toHaveAttribute("tabindex", "-1")
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  it("sets data-loading attribute when loading", () => {
    render(<Button loading>Save</Button>)
    // Content replaced by spinner — query by role without name
    const btn = screen.getByRole("button")
    expect(btn).toHaveAttribute("data-loading", "true")
  })

  it("sets aria-disabled when loading", () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true")
  })

  it("sets aria-busy when loading", () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
  })

  it("suppresses onClick when loading", async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button loading onClick={handleClick}>Save</Button>)
    await user.click(screen.getByRole("button"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("does NOT set native disabled when loading — button stays focusable", () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole("button")).not.toBeDisabled()
  })

  it("does NOT apply disabled styling when loading — data-loading guard is present", () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole("button")
    // The disabled-bg Tailwind selectors are guarded by :not([data-loading="true"]) in CSS.
    // We verify the guard attribute is present and native disabled is absent.
    expect(btn).toHaveAttribute("data-loading", "true")
    expect(btn).not.toBeDisabled()
  })

  // ── Interaction ───────────────────────────────────────────────────────────

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole("button", { name: "Click me" }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("is keyboard-activatable with Enter", async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Press</Button>)
    screen.getByRole("button", { name: "Press" }).focus()
    await user.keyboard("{Enter}")
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // ── asChild ───────────────────────────────────────────────────────────────

  it("renders as a link element when asChild wraps an anchor", () => {
    render(
      <Button asChild>
        <a href="/path">Link button</a>
      </Button>
    )
    expect(screen.getByRole("link", { name: "Link button" })).toBeInTheDocument()
  })

  // ── data-variant (used by CSS token selectors) ───────────────────────────────

  it("exposes data-variant attribute", () => {
    render(<Button variant="secondary">Sec</Button>)
    const btn = screen.getByRole("button", { name: "Sec" })
    expect(btn).toHaveAttribute("data-variant", "secondary")
  })

  // ── Disabled state — text color unchanged ─────────────────────────────────
  // Per the disabled state rule: only bg is dimmed; text color stays at variant default.
  // CSS hover/active suppression classes are present in the className string but only
  // apply when the button is interactive. jsdom cannot evaluate :hover computed styles;
  // real hover suppression is verified in Storybook (AllVariantsMatrix disabled column)
  // and in-browser via Chrome DevTools on the live portal.

  it("disabled button has correct class guards — bg-disabled class present, not text-disabled", () => {
    render(<Button variant="primary" disabled>Disabled</Button>)
    const btn = screen.getByRole("button", { name: "Disabled" })
    expect(btn.className).toContain("disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled")
    // Text-disabled class must NOT be present — text color is unchanged on disabled
    expect(btn.className).not.toContain("text-text-disabled")
  })

  it("aria-disabled button has correct class guards — bg-disabled class present, not text-disabled", () => {
    render(<Button variant="primary" aria-disabled>Aria disabled</Button>)
    const btn = screen.getByRole("button", { name: "Aria disabled" })
    expect(btn.className).toContain("aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled")
    expect(btn.className).not.toContain("text-text-disabled")
  })

  it("hover-suppression classes are present on disabled primary button", () => {
    render(<Button variant="primary" disabled>Disabled</Button>)
    const btn = screen.getByRole("button", { name: "Disabled" })
    // Hover/active fire only when not-disabled + not-aria-disabled + not-loading.
    // jsdom cannot test :hover computed styles; assert the guard class strings are present.
    // Real suppression is verified in Storybook (hover state in disabled column).
    expect(btn.className).toContain("not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-btn-primary-hover")
  })
})
