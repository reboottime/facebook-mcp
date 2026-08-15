// shadcn-source: https://ui.shadcn.com/docs/components/breadcrumb (cli, 2026-07-15)
import * as React from "react"
import { ChevronRight } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@repo/ui/lib/cn"

// Compound API, not `items={[...]}` config — mirrors the SegmentedControl
// `Object.assign(Root, { Item })` convention in this package.
//
//   <Breadcrumb>
//     <Breadcrumb.Item>
//       <Breadcrumb.Link asChild><Link href="/jobs">Jobs</Link></Breadcrumb.Link>
//     </Breadcrumb.Item>
//     <Breadcrumb.Separator />
//     <Breadcrumb.Item>
//       <Breadcrumb.Page>{entityName}</Breadcrumb.Page>
//     </Breadcrumb.Item>
//   </Breadcrumb>
//
// Two-level restraint is intentional, not a v1 gap — no BreadcrumbList/Ellipsis
// overflow machinery. A caller needing 3+ crumbs or truncation is a signal this
// pattern doesn't fit; that's a design escalation, not a reason to extend this file.

function BreadcrumbRoot({
  className,
  children,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav aria-label="Breadcrumb" data-slot="breadcrumb" className={className} {...props}>
      <ol
        data-slot="breadcrumb-list"
        className="flex flex-wrap items-center gap-1.5 typography-caption break-words"
      >
        {children}
      </ol>
    </nav>
  )
}
BreadcrumbRoot.displayName = "Breadcrumb"

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  )
}
BreadcrumbItem.displayName = "Breadcrumb.Item"

export interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  /** Render the child element instead of an `<a>` — pass the consumer's own `Link`. */
  asChild?: boolean
}

// Rest state uses `text-muted-foreground`, not the quieter `text-meta-foreground`
// (a11y review 2026-07-15: meta-foreground vs the ledger-cream background is
// ~2.73:1, fails WCAG AA for 12px body text — this is an actionable link a
// sighted user reads at rest, not a hover nicety). Hover escalates to
// `text-foreground` for a clear interactive signal.
const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  function BreadcrumbLink({ asChild = false, className, ...props }, ref) {
    const Comp = asChild ? Slot.Root : "a"
    return (
      <Comp
        ref={ref}
        data-slot="breadcrumb-link"
        className={cn(
          "text-muted-foreground transition-colors duration-fast ease-out-standard hover:text-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
BreadcrumbLink.displayName = "Breadcrumb.Link"

// `text-foreground`, not `text-muted-foreground` — the current page is the
// emphasized crumb (reference: `Sandboxes › staging-agent`, leaf brighter than
// parent). This also means hover-on-parent and current-page land on the same
// value; that's intentional, not a collision — hover is signalling "this will
// become your current page." Contrast: --ledger-ink-900 vs --ledger-cream is
// ~12.8:1, comfortably past the muted-foreground rest state's ~5.25:1.
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("text-foreground", className)}
      {...props}
    />
  )
}
BreadcrumbPage.displayName = "Breadcrumb.Page"

// Decorative + aria-hidden, so WCAG non-text-contrast doesn't gate it — still
// picked meta-foreground over the paler border token so the glyph reads at a
// glance instead of disappearing against the ledger-cream background.
function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("inline-flex items-center text-meta-foreground", className)}
      {...props}
    >
      <ChevronRight className="size-4" />
    </li>
  )
}
BreadcrumbSeparator.displayName = "Breadcrumb.Separator"

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
})
