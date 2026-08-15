"use client"

// shadcn-source: https://ui.shadcn.com/docs/components/button (cli, 2026-05-26)
// Client boundary: Button forwards a synthesized `onClick` to its rendered
// element, so server components that render <Button> would otherwise crash
// RSC serialization with "Event handlers cannot be passed to Client Component
// props".
import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/cn"
import { buttonBaseClasses } from "./button-base"

// Disabled has three paths: native :disabled (browser blocks click + focus),
// aria-disabled="true" (focusable, click suppressed in handleClick), and loading
// (aria-disabled + data-loading, click suppressed, keeps variant bg — Mantine
// /Primer "busy ≠ off" pattern). Bg/text/cursor selectors all guard with
// :not([data-loading]) so loading doesn't pick up the disabled visual.
// Tailwind v4: use the built-in `aria-disabled:` modifier — the arbitrary
// `[aria-disabled='true']:` form compiles to a broken `:is()` selector.
const buttonVariants = cva(
  [
    ...buttonBaseClasses,
    "h-8 px-3.5 py-0 typography-body font-semibold rounded-sm gap-2 [&_svg]:size-4",
    "transition-[background-color,color,border-color] duration-fast ease-out-standard",
  ],
  {
    variants: {
      variant: {
        // Solid fill, highest-contrast action. Ledger apps map this to their ink color.
        primary: [
          "bg-btn-primary text-btn-primary-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-btn-primary-hover",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-btn-primary-hover",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-primary",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-primary",
        ],

        // Deprecated alias of the pre-ledger neutral outline look. Kept only because
        // dialog.tsx / alert-dialog.tsx / range-popover-base.tsx and ~30 story call
        // sites reference the literal variant key "secondary" — new call sites should
        // use `outline` instead (identical look, ledger-mappable token names).
        secondary: [
          "border border-border bg-transparent text-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-hover-surface",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-selected-surface",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
        ],

        // Transparent + 1px border; hover fills to a tint. Ledger: "Propose a new
        // time" / "Cancel" look.
        outline: [
          "border border-btn-outline-border bg-transparent text-btn-outline-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-btn-outline-hover",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:text-btn-outline-foreground-hover",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-btn-outline-active",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
        ],

        // Text-only — no border, no fill at any state (including hover). Ledger:
        // "Decline" / "Back" / "Skip the card" look.
        ghost: [
          "bg-transparent text-btn-ghost-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:text-btn-ghost-foreground-hover",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
        ],

        // Solid fill, secondary brand action. Ledger apps map this to their
        // messaging-channel accent (e.g. WhatsApp green). Ledger: "Message {name}"
        // (job/customer detail) look.
        accent: [
          "bg-btn-accent text-btn-accent-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-btn-accent-hover",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-btn-accent-hover",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled-accent",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled-accent",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-accent",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-accent",
        ],

        // Tint fill + 1px border, quieter accent action. Ledger: "Message {name}"
        // (team cards) / composer "Send" look — only the border darkens on hover.
        "accent-soft": [
          "border border-btn-accent-soft-border bg-btn-accent-soft text-btn-accent-soft-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:border-btn-accent-soft-border-hover",
          "disabled:[&:not([data-loading])]:border-transparent",
          "aria-disabled:[&:not([data-loading])]:border-transparent",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-ghost",
        ],

        // Teal focus ring clashes on a red fill — override to destructive outline.
        destructive: [
          "bg-destructive text-destructive-foreground",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-destructive-hover",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-destructive-active",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled-destructive",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-filled-destructive",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-destructive",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-destructive",
          "focus-visible:outline-destructive focus-visible:shadow-focus-errored",
        ],

        "destructive-ghost": [
          "bg-transparent text-state-errored",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:bg-state-errored-subtle",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:hover:text-state-errored-text",
          "not-disabled:not-aria-disabled:[&:not([data-loading])]:active:bg-state-errored-subtle",
          "disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "aria-disabled:[&:not([data-loading])]:bg-button-disabled-bg-ghost",
          "disabled:[&:not([data-loading])]:text-button-disabled-text-destructive-ghost",
          "aria-disabled:[&:not([data-loading])]:text-button-disabled-text-destructive-ghost",
        ],
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

// Inline spinner — no separate Spinner component exists in @repo/ui.
// motion-safe:animate-spin respects prefers-reduced-motion.
const SpinnerIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 motion-safe:animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Renders a spinner instead of label, sets aria-disabled + aria-busy, and
   * suppresses onClick. The button stays focusable so screen readers can
   * announce the busy state. Does NOT apply the disabled visual — loading is
   * "busy but valid", not "invalid".
   */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      asChild = false,
      loading = false,
      onClick,
      "aria-disabled": ariaDisabledProp,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot.Root : "button"

    // Loading + caller-supplied aria-disabled both render as "focusable disabled":
    // aria-disabled is set, native disabled is NOT, button stays in tab order.
    const isAriaDisabled = loading || ariaDisabledProp === true || ariaDisabledProp === "true"

    // aria-disabled doesn't block clicks at the browser level (native disabled does),
    // so suppress manually.
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isAriaDisabled) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      },
      [isAriaDisabled, onClick]
    )

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-loading={loading ? "true" : undefined}
        aria-disabled={isAriaDisabled ? true : undefined}
        aria-busy={loading ? true : undefined}
        className={cn(buttonVariants({ variant, className }))}
        onClick={handleClick}
        {...props}
      >
        {loading ? <SpinnerIcon /> : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
