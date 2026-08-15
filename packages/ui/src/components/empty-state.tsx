// shadcn-source: radix-wrap:n/a (n/a, 2026-05-30)
// No shadcn primitive; authored as a pure presentational component per spec.
// Sourcing: from-scratch-approved:design-system-architect-2026-05-30
import * as React from "react"
import type { ComponentType, HTMLAttributes } from "react"

import { cn } from "@repo/ui/lib/cn"

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmptyStateVariant = "zero-state" | "no-results"
export type EmptyStateSize = "md" | "sm"

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant: EmptyStateVariant
  /**
   * Lucide icon component.
   * Required for zero-state + size="md" — dev warning if missing.
   * Optional for no-results + size="md" — rendered when provided (opt-in visual anchor).
   * Always suppressed for size="sm".
   */
  icon?: ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  /** Button element; caller controls label + onClick. One max. */
  cta?: React.ReactNode
  /** @default "md" */
  size?: EmptyStateSize
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, variant, icon: Icon, title, subtitle, cta, size = "md", ...props }, ref) => {
    if (
      process.env.NODE_ENV === "development" &&
      variant === "zero-state" &&
      size === "md" &&
      Icon == null
    ) {
      console.warn(
        "[EmptyState] zero-state/md rendered without icon prop — icon container suppressed."
      )
    }

    const showIconContainer = size === "md" && Icon != null

    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex flex-col items-center justify-center text-center",
          size === "md" ? "py-12 px-6 gap-4" : "py-6 px-4 gap-3",
          className
        )}
        {...props}
      >
        {/* Icon container — md + icon provided (required on zero-state, opt-in on no-results) */}
        {showIconContainer && (
          <div
            className={cn(
              "flex items-center justify-center shrink-0",
              "size-12",
              "rounded-lg",
              "bg-hover-surface"
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
          </div>
        )}

        {/* Text block */}
        <div className="flex flex-col items-center gap-1 typography-body">
          <p className="font-medium text-foreground">
            {title}
          </p>
          {subtitle != null && (
            <p className="text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* CTA slot — optional */}
        {cta != null && cta}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
