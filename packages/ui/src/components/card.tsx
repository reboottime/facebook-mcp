// shadcn-source: https://ui.shadcn.com/docs/components/card (cli, 2026-05-26)
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/cn"

const cardVariants = cva(
  // Base: text, radius, flex layout — bg and border intentionally omitted here;
  // each variant sets them explicitly so elevated can rely on shadow-card's ring
  // as its sole boundary (avoids the doubled-outline artifact when the 1px ring
  // shadow and border-border sit adjacent).
  [
    "relative flex flex-col",
    "rounded-surface",
    "text-foreground",
  ],
  {
    variants: {
      variant: {
        /**
         * Default: flat card, canonical panel surface, border only.
         * No shadow — border provides separation.
         */
        default: ["bg-card", "border border-border"],

        /**
         * Elevated: card surface with shadow-card providing both the 1px ring
         * boundary AND the soft drop. No explicit border — the ring layer of
         * --shadow-1 (0 0 0 1px rgba) is the single edge, which avoids the
         * double-outline artifact when border + ring sit adjacent.
         * Visually distinct from default: shadow replaces border as the edge.
         */
        elevated: ["bg-card", "shadow-card"],

        /**
         * Interactive: clickable/hoverable tile.
         * Full-surface bg-hover-surface fill on hover — no shadow escalation.
         */
        interactive: [
          "bg-card",
          "border border-border",
          "cursor-pointer",
          "transition-colors duration-fast",
          "hover:border-border-strong hover:bg-hover-surface",
          // Focus ring — *:focus-visible in base.css (WCAG 2.4.11). No per-component override needed.
        ],

        /**
         * Selected: stable selection state (multi-select taskset scenarios).
         * Darker warm-grey fill + elevated border step signals "chosen".
         * bg-card is NOT in base — ensures bg-selected-surface wins without merge fights.
         */
        selected: [
          "bg-selected-surface",
          "border border-border-strong",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

// No forwardRef needed on layout slots — they are thin divs with no focus
// management or imperative handles.

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5",
        "px-4 pt-4 pb-3",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "border-b border-border last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("typography-body font-medium leading-snug", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("typography-caption text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 py-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center",
        "px-4 pt-3 pb-4",
        "border-t border-border first:border-t-0",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
