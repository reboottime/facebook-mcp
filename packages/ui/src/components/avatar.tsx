// shadcn-source: https://ui.shadcn.com/docs/components/avatar (cli, 2026-05-26)
"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/cn"

// ── Variants ──────────────────────────────────────────────────────────────────

const avatarVariants = cva(
  "group/avatar relative flex shrink-0 overflow-hidden select-none",
  {
    variants: {
      size: {
        xs: "size-5",   // 20px — tight stacks / compact AvatarGroup
        sm: "size-7",   // 28px — AvatarGroup standard, inline mentions
        md: "size-8",   // 32px — default
        lg: "size-10",  // 40px — page-level hero, profile header
      },
      shape: {
        circle: "rounded-full",  // user avatars
        square: "rounded-lg",    // org/team avatars
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  }
)

// ── Avatar Root ───────────────────────────────────────────────────────────────

export interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, shape, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size ?? "md"}
      data-shape={shape ?? "circle"}
      className={cn(avatarVariants({ size, shape }), className)}
      {...props}
    />
  )
}

// ── Avatar Image ──────────────────────────────────────────────────────────────

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

// ── AvatarFallback ───────────────────────────────────────────────────────────
// Quiet surface: bg-hover-surface + text-muted-foreground — same pattern as
// section icon containers (e.g. addon-row). Defers visual weight to the name
// alongside it. Font: mono semibold, size keyed to parent size via data-size.

export type AvatarFallbackProps = React.ComponentProps<typeof AvatarPrimitive.Fallback>

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center",
        "bg-hover-surface text-muted-foreground font-mono font-semibold rounded-full",
        // text sizes keyed to parent size via data-size on group
        "text-[10px]", // eslint-disable-line no-restricted-syntax -- no token for 10px; xs size only
        "group-data-[size=sm]/avatar:typography-label",
        "group-data-[size=md]/avatar:typography-label",
        "group-data-[size=lg]/avatar:typography-body",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
