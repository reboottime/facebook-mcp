// shadcn-source: radix-wrap:ToggleGroup (n/a, 2026-05-31)
//
// ADS mapping (jira-component-mapping, 2026-07-23): no ADS package ships this
// (@atlaskit/segmented-control 404s), but Jira renders the shape as a
// connected bordered button group — square-ish radius, divider between
// items, filled selected state — not a sliding thumb on a recessed track
// (the retired Kitchen-Table Ledger look). Restyled to match; ARIA unchanged
// (Radix ToggleGroup, role=group + aria-pressed, is still correct).
"use client"

import * as React from "react"
import { ToggleGroup } from "radix-ui"
import { cva } from "class-variance-authority"

import { cn } from "@repo/ui/lib/cn"

export const segmentedControlRootVariants = cva(
  [
    "inline-flex items-center justify-center",
    "h-8 overflow-hidden rounded-sm border border-form-field-border",
    "text-muted-foreground",
  ],
  {
    variants: {
      disabled: {
        true:  "opacity-50 pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      disabled: false,
    },
  }
)

export const segmentedControlItemVariants = cva([
  "inline-flex h-full items-center justify-center gap-1.5 px-3",
  "typography-body font-medium select-none",
  "border-r border-form-field-border last:border-r-0",
  "data-[state=off]:hover:bg-hover-surface data-[state=off]:hover:text-foreground",
  "data-[state=on]:bg-selected-surface data-[state=on]:text-selected-foreground data-[state=on]:font-semibold",
  "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
  "transition-colors duration-fast ease-out-standard",
])

export interface SegmentedControlProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof ToggleGroup.Root>,
    "type" | "value" | "onValueChange" | "defaultValue"
  > {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export interface SegmentedControlOption
  extends Omit<
    React.ComponentPropsWithoutRef<typeof ToggleGroup.Item>,
    "value"
  > {
  value: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

interface SegmentedControlContextValue {
  currentValue: string
}

const SegmentedControlContext =
  React.createContext<SegmentedControlContextValue>({
    currentValue: "",
  })

const SegmentedControlRoot = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Root>,
  SegmentedControlProps
>(function SegmentedControlRoot(
  {
    value,
    onValueChange,
    disabled = false,
    className,
    children,
    ...props
  },
  ref
) {
  const warnedRef = React.useRef(false)
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !warnedRef.current) {
      const label = props["aria-label"]
      const labelledBy = props["aria-labelledby"]
      if (!label && !labelledBy) {
        warnedRef.current = true
        console.warn(
          "[SegmentedControl] Root requires an aria-label or aria-labelledby for screen-reader users. Example: <SegmentedControl aria-label=\"Theme\">."
        )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deselect guard: Radix fires onValueChange("") when the active segment is
  // clicked again. Intercept and discard — selection is always required.
  const handleValueChange = (v: string) => {
    if (v) onValueChange(v)
  }

  return (
    <SegmentedControlContext.Provider value={{ currentValue: value }}>
      <ToggleGroup.Root
        ref={ref}
        type="single"
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        data-slot="segmented-control"
        className={cn(segmentedControlRootVariants({ disabled }), className)}
        {...props}
      >
        {children}
      </ToggleGroup.Root>
    </SegmentedControlContext.Provider>
  )
})

SegmentedControlRoot.displayName = "SegmentedControl"

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Item>,
  SegmentedControlOption
>(function SegmentedControlItem(
  { value, disabled = false, className, children, ...props },
  ref
) {
  const { currentValue } = React.useContext(SegmentedControlContext)

  const isActive = value === currentValue
  const effectiveDisabled = isActive ? false : disabled

  return (
    <ToggleGroup.Item
      ref={ref}
      value={value}
      disabled={effectiveDisabled}
      data-slot="segmented-control-item"
      className={cn(segmentedControlItemVariants(), className)}
      {...props}
    >
      {children}
    </ToggleGroup.Item>
  )
})

SegmentedControlItem.displayName = "SegmentedControl.Item"

export const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Item: SegmentedControlItem,
})
