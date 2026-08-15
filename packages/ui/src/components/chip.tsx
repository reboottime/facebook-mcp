"use client"

// shadcn-source: from-scratch-approved:design-system-architect (n/a)
// No shadcn chip primitive; no Radix toggle-group match for this shape.
//
// ADS mapping (jira-component-mapping, 2026-07-23) — keep ours: it's a toggle
// INPUT (aria-pressed, controlled checked state), none of Lozenge/Tag/Badge is
// an input. Radius matched to ADS Tag's 4px (@atlaskit/tag@15.4.0) instead of
// Tailwind's default 6px, so it reads as the same crisp Jira family as Button.
//
// API:
//   color:   brand | success | info | warning | destructive | neutral
//   variant: filled | light | outline
//   interactive: true (default, <button>) | false (<span>, display chip)
//
// Multi-select only — single (exclusive) mode not yet implemented; add later by
// accepting `type="single"|"multiple"` on ChipGroup and adjusting the reducer.
//
// Foreground pairing rationale (WCAG AA perceptual contrast):
//   brand       → text-primary-foreground (pinned white on orange — 4.35:1 light, 6.1:1 dark)
//   success     → text-foreground (dark ink on green — green is luminous in dark mode, white fails ~3.1:1)
//   info        → text-foreground (dark ink on blue — #33A1FF dark is bright, white fails ~1.9:1)
//   warning     → text-foreground (dark ink on amber — white on any amber step fails WCAG AA)
//   destructive → text-foreground (dark ink on red — #F47474 dark is bright, white ~2.1:1 fails)
//   neutral     → text-foreground (dark ink on muted surface)

import * as React from "react"
import { Check } from "lucide-react"
import { cva } from "class-variance-authority"
import { cn } from "@repo/ui/lib/cn"

// ─── Variants ────────────────────────────────────────────────────────────────

const chipVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "typography-caption",
    "rounded-sm border px-2.5 py-1",
    "select-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3.5",
  ],
  {
    variants: {
      color: {
        brand:       "",
        success:     "",
        info:        "",
        warning:     "",
        destructive: "",
        neutral:     "",
      },
      variant: {
        filled:  "",
        light:   "",
        outline: "",
      },
      checked: {
        true:  "",
        false: "",
      },
      interactive: {
        true:  [
          "cursor-pointer",
          "transition-colors duration-fast ease-out-standard",
          "disabled:cursor-not-allowed",
          // Disabled overrides: text, border, bg — no hover lift.
          "disabled:text-text-disabled disabled:border-border-disabled disabled:bg-muted-surface",
        ],
        false: [],
      },
    },
    compoundVariants: [
      // ── filled × brand ──────────────────────────────────────────────────────
      {
        variant: "filled",
        color: "brand",
        checked: true,
        className: "bg-primary border-primary text-primary-foreground",
      },
      {
        variant: "filled",
        color: "brand",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "brand",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "brand",
        checked: true,
        interactive: true,
        className: "hover:bg-primary-hover hover:border-primary",
      },

      // ── filled × success ────────────────────────────────────────────────────
      {
        variant: "filled",
        color: "success",
        checked: true,
        className: "bg-state-scored border-state-scored text-foreground",
      },
      {
        variant: "filled",
        color: "success",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "success",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "success",
        checked: true,
        interactive: true,
        className: "hover:bg-state-scored border-state-scored",
      },

      // ── filled × info ───────────────────────────────────────────────────────
      {
        variant: "filled",
        color: "info",
        checked: true,
        className: "bg-state-running border-state-running text-foreground",
      },
      {
        variant: "filled",
        color: "info",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "info",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "info",
        checked: true,
        interactive: true,
        className: "hover:bg-state-running border-state-running",
      },

      // ── filled × warning ────────────────────────────────────────────────────
      {
        variant: "filled",
        color: "warning",
        checked: true,
        className: "bg-state-warning border-state-warning text-foreground",
      },
      {
        variant: "filled",
        color: "warning",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "warning",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "warning",
        checked: true,
        interactive: true,
        className: "hover:bg-state-warning border-state-warning",
      },

      // ── filled × destructive ────────────────────────────────────────────────
      {
        variant: "filled",
        color: "destructive",
        checked: true,
        className: "bg-state-errored border-state-errored text-foreground",
      },
      {
        variant: "filled",
        color: "destructive",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "destructive",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "destructive",
        checked: true,
        interactive: true,
        className: "hover:bg-state-errored border-state-errored",
      },

      // ── filled × neutral ────────────────────────────────────────────────────
      {
        variant: "filled",
        color: "neutral",
        checked: true,
        className: "bg-muted-surface border-border-strong text-foreground",
      },
      {
        variant: "filled",
        color: "neutral",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "filled",
        color: "neutral",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "filled",
        color: "neutral",
        checked: true,
        interactive: true,
        className: "hover:bg-hover-surface border-border-strong",
      },

      // ── light × brand ───────────────────────────────────────────────────────
      {
        variant: "light",
        color: "brand",
        checked: true,
        className: "bg-primary-soft border-primary-border text-foreground",
      },
      {
        variant: "light",
        color: "brand",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "brand",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "brand",
        checked: true,
        interactive: true,
        className: "hover:bg-primary-soft hover:border-primary-border",
      },

      // ── light × success ─────────────────────────────────────────────────────
      {
        variant: "light",
        color: "success",
        checked: true,
        className: "bg-state-scored-subtle border-state-scored-subtle text-state-scored-text",
      },
      {
        variant: "light",
        color: "success",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "success",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "success",
        checked: true,
        interactive: true,
        className: "hover:bg-state-scored-subtle hover:border-state-scored-subtle",
      },

      // ── light × info ────────────────────────────────────────────────────────
      // bg + border use solid-mix tokens (alert-info-bg, state-running) instead
      // of the state-*-subtle alpha tints — low-alpha fills and borders
      // perceptually collapse against the dark card surface, leaving selection
      // signalled by text color alone.
      {
        variant: "light",
        color: "info",
        checked: true,
        className: "bg-alert-info-bg border-state-running text-state-running-text",
      },
      {
        variant: "light",
        color: "info",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "info",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "info",
        checked: true,
        interactive: true,
        className: "hover:bg-alert-info-bg hover:border-state-running",
      },

      // ── light × warning ─────────────────────────────────────────────────────
      {
        variant: "light",
        color: "warning",
        checked: true,
        className: "bg-state-warning-subtle border-state-warning-subtle text-state-warning-text",
      },
      {
        variant: "light",
        color: "warning",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "warning",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "warning",
        checked: true,
        interactive: true,
        className: "hover:bg-state-warning-subtle hover:border-state-warning-subtle",
      },

      // ── light × destructive ─────────────────────────────────────────────────
      {
        variant: "light",
        color: "destructive",
        checked: true,
        className: "bg-state-errored-subtle border-state-errored-subtle text-state-errored-text",
      },
      {
        variant: "light",
        color: "destructive",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "destructive",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "destructive",
        checked: true,
        interactive: true,
        className: "hover:bg-state-errored-subtle hover:border-state-errored-subtle",
      },

      // ── light × neutral ─────────────────────────────────────────────────────
      {
        variant: "light",
        color: "neutral",
        checked: true,
        className: "bg-muted-surface border-border text-foreground",
      },
      {
        variant: "light",
        color: "neutral",
        checked: false,
        className: "bg-background border-border text-muted-foreground",
      },
      {
        variant: "light",
        color: "neutral",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "light",
        color: "neutral",
        checked: true,
        interactive: true,
        className: "hover:bg-muted-surface hover:border-border",
      },

      // ── outline × brand ─────────────────────────────────────────────────────
      {
        variant: "outline",
        color: "brand",
        checked: true,
        className: "bg-transparent border-primary text-primary",
      },
      {
        variant: "outline",
        color: "brand",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "brand",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "brand",
        checked: true,
        interactive: true,
        className: "hover:border-primary",
      },

      // ── outline × success ───────────────────────────────────────────────────
      {
        variant: "outline",
        color: "success",
        checked: true,
        className: "bg-transparent border-state-scored text-state-scored-text",
      },
      {
        variant: "outline",
        color: "success",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "success",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "success",
        checked: true,
        interactive: true,
        className: "hover:border-state-scored",
      },

      // ── outline × info ──────────────────────────────────────────────────────
      {
        variant: "outline",
        color: "info",
        checked: true,
        className: "bg-transparent border-state-running text-state-running-text",
      },
      {
        variant: "outline",
        color: "info",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "info",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "info",
        checked: true,
        interactive: true,
        className: "hover:border-state-running",
      },

      // ── outline × warning ───────────────────────────────────────────────────
      {
        variant: "outline",
        color: "warning",
        checked: true,
        className: "bg-transparent border-state-warning text-state-warning-text",
      },
      {
        variant: "outline",
        color: "warning",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "warning",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "warning",
        checked: true,
        interactive: true,
        className: "hover:border-state-warning",
      },

      // ── outline × destructive ───────────────────────────────────────────────
      {
        variant: "outline",
        color: "destructive",
        checked: true,
        className: "bg-transparent border-state-errored text-state-errored-text",
      },
      {
        variant: "outline",
        color: "destructive",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "destructive",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "destructive",
        checked: true,
        interactive: true,
        className: "hover:border-state-errored",
      },

      // ── outline × neutral ───────────────────────────────────────────────────
      {
        variant: "outline",
        color: "neutral",
        checked: true,
        className: "bg-transparent border-border-strong text-foreground",
      },
      {
        variant: "outline",
        color: "neutral",
        checked: false,
        className: "bg-transparent border-border text-muted-foreground",
      },
      {
        variant: "outline",
        color: "neutral",
        checked: false,
        interactive: true,
        className: "hover:border-border-strong hover:text-foreground",
      },
      {
        variant: "outline",
        color: "neutral",
        checked: true,
        interactive: true,
        className: "hover:border-border-strong",
      },

      // ── Universal overrides (applied last) ────────────────────────────────
      // Unselected: lift to bg-card — neutral in light, gives shape in dark
      // (bg-transparent alone fails in dark mode: no surface = no chip).
      { checked: false, className: "bg-card" },
    ],
    defaultVariants: {
      color: "brand",
      variant: "filled",
      checked: false,
      interactive: true,
    },
  },
)

// ─── Context ─────────────────────────────────────────────────────────────────

interface ChipGroupContextValue {
  value: ReadonlyArray<string>
  onCheckedChange: (chipValue: string, checked: boolean) => void
  color?: ChipColor
  variant?: ChipVariant
}

const ChipGroupContext = React.createContext<ChipGroupContextValue | null>(null)

function useChipGroupContext() {
  return React.useContext(ChipGroupContext)
}

// ─── ChipGroup ───────────────────────────────────────────────────────────────

export interface ChipGroupProps {
  /** Currently selected values (controlled). */
  value: ReadonlyArray<string>
  /** Called with the full next value array whenever a chip toggles. */
  onChange: (next: ReadonlyArray<string>) => void
  children: React.ReactNode
  className?: string
  /** Forwarded to the wrapping <div role="group">. */
  "aria-label"?: string
  "aria-labelledby"?: string
  /** Default color for all chips in the group. Per-chip `color` prop overrides. */
  color?: ChipColor
  /** Default variant for all chips in the group. Per-chip `variant` prop overrides. */
  variant?: ChipVariant
}

const ChipGroup = React.forwardRef<HTMLDivElement, ChipGroupProps>(
  (
    {
      value,
      onChange,
      children,
      className,
      color,
      variant,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
    },
    ref,
  ) => {
    function handleCheckedChange(chipValue: string, checked: boolean) {
      if (checked) {
        onChange([...value, chipValue])
      } else {
        onChange(value.filter((v) => v !== chipValue))
      }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      const container = e.currentTarget
      const chips = Array.from(
        container.querySelectorAll<HTMLButtonElement>("[data-chip]"),
      ).filter((el) => !el.disabled)

      if (chips.length === 0) return

      const focused = document.activeElement as HTMLElement
      const idx = chips.indexOf(focused as HTMLButtonElement)

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        const next = chips[(idx + 1) % chips.length]
        next?.focus()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        const prev = chips[(idx - 1 + chips.length) % chips.length]
        prev?.focus()
      }
    }

    return (
      <ChipGroupContext.Provider value={{ value, onCheckedChange: handleCheckedChange, color, variant }}>
        <div
          ref={ref}
          role="group"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          className={cn("flex flex-wrap gap-1.5", className)}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </ChipGroupContext.Provider>
    )
  },
)
ChipGroup.displayName = "ChipGroup"

// ─── Chip ────────────────────────────────────────────────────────────────────

export type ChipColor = "brand" | "success" | "info" | "warning" | "destructive" | "neutral"
export type ChipVariant = "filled" | "light" | "outline"

export interface ChipProps extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  children: React.ReactNode
  /**
   * Required when used inside ChipGroup — must match a value in the group's
   * `value` array for checked state to be managed by context.
   * Optional when used standalone (controlled via `checked` + `onCheckedChange`).
   */
  value?: string
  /** Controlled checked state (standalone usage). Ignored inside ChipGroup. */
  checked?: boolean
  /** Toggle callback (standalone usage). Ignored inside ChipGroup. */
  onCheckedChange?: (checked: boolean) => void
  /**
   * `true` (default) → renders as `<button>` toggle with aria-pressed + hover affordance.
   * `false` → renders as `<span>` display chip: no aria-pressed, no hover transitions,
   * no click handling. `checked` still drives visual state (use to highlight a "current"
   * value among display chips).
   */
  interactive?: boolean
  /**
   * Color intent. Default `brand` (orange).
   * Maps to semantic state tokens — no domain meaning attached.
   */
  color?: ChipColor
  /**
   * Visual treatment for the selected state. Default `filled`.
   *   filled  — solid color bg + contrasting foreground (strongest selection signal)
   *   light   — soft tinted bg + colored text (subtle emphasis)
   *   outline — transparent bg + colored border + colored text
   */
  variant?: ChipVariant
}

const Chip = React.forwardRef<HTMLButtonElement | HTMLSpanElement, ChipProps>(
  (
    {
      children,
      value,
      checked: checkedProp,
      onCheckedChange,
      interactive = true,
      color: colorProp,
      variant: variantProp,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const groupCtx = useChipGroupContext()

    // Per-chip prop > group context > primitive default.
    const color: ChipColor = colorProp ?? groupCtx?.color ?? "brand"
    const variant: ChipVariant = variantProp ?? groupCtx?.variant ?? "filled"

    const isChecked: boolean = groupCtx
      ? value !== undefined && groupCtx.value.includes(value)
      : (checkedProp ?? false)

    const variantClasses = chipVariants({
      color,
      variant,
      checked: isChecked,
      interactive: interactive as boolean,
    })

    if (!interactive) {
      const isDisabled = (props as { disabled?: boolean }).disabled === true
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          data-chip=""
          aria-disabled={isDisabled || undefined}
          className={cn(
            variantClasses,
            // CSS `:disabled` doesn't fire on <span>, so apply the same disabled
            // chrome (cursor, muted text/border, surface fill) via attribute hook.
            isDisabled &&
              "cursor-not-allowed text-text-disabled border-border-disabled bg-muted-surface",
            className,
          )}
        >
          {children}
        </span>
      )
    }

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(e)
      if (e.defaultPrevented) return

      if (groupCtx && value !== undefined) {
        groupCtx.onCheckedChange(value, !isChecked)
      } else {
        onCheckedChange?.(!isChecked)
      }
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-pressed={isChecked}
        data-chip=""
        className={cn(variantClasses, className)}
        onClick={handleClick}
        {...props}
      >
        {isChecked && (
          <Check aria-hidden="true" />
        )}
        {children}
      </button>
    )
  },
)
Chip.displayName = "Chip"

// ─── Exports ─────────────────────────────────────────────────────────────────

export { Chip, ChipGroup, chipVariants }
