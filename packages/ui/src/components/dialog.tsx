// shadcn-source: https://ui.shadcn.com/docs/components/dialog (cli, 2026-05-26)
"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/cn"
import { useScrolled } from "@repo/ui/lib/use-scrolled"
import {
  overlayPanelBody,
  overlayPanelDescription,
  overlayPanelFooterBase,
  overlayPanelFooterScrolled,
  overlayPanelHeaderBase,
  overlayPanelHeaderScrolled,
  overlayPanelSurface,
  overlayPanelTitle,
} from "@repo/ui/lib/overlay-panel"
import { Button } from "@repo/ui/components/button"

const DialogScrollTopContext = React.createContext<boolean>(false)
const DialogScrollBottomContext = React.createContext<boolean>(false)

// Callback ref (not MutableRefObject): Radix Portal defers mount to a 2nd render, so a stable ref object would fire useEffect once with null and never re-fire.
const DialogBodyRefContext = React.createContext<((el: HTMLDivElement | null) => void) | null>(null)

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-overlay",
        "bg-overlay-dialog",
        "supports-[backdrop-filter]:backdrop-blur-overlay-dialog",
        "data-[state=open]:animate-fade-in",
        "data-[state=closed]:animate-fade-out",
        className
      )}
      {...props}
    />
  )
}

const dialogContentVariants = cva(
  [
    "fixed inset-0 z-overlay",
    "flex flex-col w-full",
    overlayPanelSurface,
    // Safe-area insets: prevent iOS home-indicator from hiding footer on mobile sheet.
    // Reset at sm+ where the panel is a bounded modal, not a viewport-filling sheet.
    "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
    "sm:pb-0 sm:pt-0",
    // outline-none: focus managed by Radix; panel itself is not a focus target
    "outline-none",
    "data-[state=open]:animate-slide-up-from-bottom",
    "data-[state=closed]:animate-slide-down-to-bottom",
    // Restore panel chrome: rounded corners, drop shadow (no border — shadow alone
    // defines the panel edge; a 1px border next to a soft halo reads as double edge).
    // sm:top-dialog-top-offset / sm:max-h-dialog-max-h scoped to sm+ so mobile fullscreen is not height-capped.
    "sm:inset-auto sm:top-(--dialog-top-offset) sm:left-1/2 sm:-translate-x-1/2",
    "sm:max-h-(--dialog-max-h)",
    "sm:shadow-modal",
    "sm:rounded-lg",
    "sm:data-[state=open]:animate-slide-up-in",
    "sm:data-[state=closed]:animate-slide-down-out",
  ],
  {
    variants: {
      size: {
        // min() caps at target width above sm, and at (100vw − 2rem) below sm — 1rem gutter each side.
        // Width variants only apply at sm+ (mobile is always 100vw via inset-0).
        sm: "sm:w-[min(400px,calc(100vw-2rem))]",
        md: "sm:w-[min(560px,calc(100vw-2rem))]",
        lg: "sm:w-[min(720px,calc(100vw-2rem))]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Show or hide the × close button in the header area. Default: true. */
  showCloseButton?: boolean
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size,
  ...props
}: DialogContentProps) {
  // useState (not useRef): Radix Portal defers mount to a 2nd render. Only a
  // state update re-fires useScrolled's [el] effect so the scroll listener
  // actually attaches when DialogBody appears; mutating a ref would not.
  const [bodyEl, setBodyEl] = React.useState<HTMLDivElement | null>(null)
  const { top, bottom } = useScrolled(bodyEl)

  const bodyCallbackRef = React.useCallback((el: HTMLDivElement | null) => {
    setBodyEl(el)
  }, [])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        <DialogScrollTopContext.Provider value={top}>
          <DialogScrollBottomContext.Provider value={bottom}>
            <DialogBodyRefContext.Provider value={bodyCallbackRef}>
              {children}
            </DialogBodyRefContext.Provider>
          </DialogScrollBottomContext.Provider>
        </DialogScrollTopContext.Provider>
        {showCloseButton && (
          // Rendered AFTER children so that (a) DialogHeader's z-sticky stacking
          // context doesn't cover the button (header DOM is now before button,
          // hit-testing reaches button), and (b) Radix FocusScope's "first
          // focusable" auto-focus lands on the form input, not this close button.
          <>
            {/* Grab handle — mobile sheet discoverability affordance only.
                Decorative bar; aria-hidden. Close X + Escape remain the actual dismiss paths. */}
            <div
              aria-hidden="true"
              className="absolute top-2 inset-x-0 flex justify-center sm:hidden"
            >
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <DialogPrimitive.Close
              data-slot="dialog-close-button"
              className={cn(
                // top-[18px]: structural compensation — aligns button optical center with DialogTitle optical center
                // Inter cap-height ≈ 0.73em; at typography-subtitle 16px → cap = 11.68px, optical center = 5.84px above cap top
                // DialogHeader pt-6 (24px) + 5.84 = 29.84px; button size-6 center = top + 12px → top = 17.84px ≈ 18px
                "absolute top-[18px] right-4 z-sticky",
                // Mobile: 44px touch target (WCAG 2.5.5). Desktop: size-6 where cursor precision applies.
                "size-11 sm:size-6",
                "inline-flex items-center justify-center shrink-0",
                "bg-transparent hover:bg-hover-surface",
                "text-muted-foreground",
                "rounded-md",
                // T2 — prop-(--motion-state-change) doesn't set --tw-duration; explicit tokens resolve correctly
                "transition-colors duration-fast ease-out-standard",
                // Focus ring — *:focus-visible in base.css (WCAG 2.4.11). outline-none removed; base layer owns it.
                "disabled:pointer-events-none cursor-pointer",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              )}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const scrolled = React.useContext(DialogScrollTopContext)

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // flex-col gap-1: title stacks above description; close button is absolute (outside flex flow)
        "flex flex-col gap-1",
        overlayPanelHeaderBase,
        scrolled && overlayPanelHeaderScrolled,
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(overlayPanelTitle, className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(overlayPanelDescription, className)}
      {...props}
    />
  )
}

const DIALOG_BODY_STYLE: React.CSSProperties = { scrollbarGutter: "stable both-edges" }

function DialogBody({ className, children, ...props }: React.ComponentProps<"div">) {
  const bodyCallbackRef = React.useContext(DialogBodyRefContext)

  return (
    <div
      data-slot="dialog-body"
      className={overlayPanelBody}
    >
      {/* scrollbar-gutter: stable both-edges reserves equal space on both sides so content never
          reflows and left/right insets stay symmetric.
          px-6: matches dialog header/footer pl-6, giving inputs symmetric horizontal inset AND
          providing left-edge clearance for the focus ring box-shadow within the overflow:auto clip box.
          tabIndex={-1}: Chromium's keyboard-focusable-scroll-containers would otherwise land focus
          here, triggering the global focus-visible ring on a passive region. */}
      <div
        ref={bodyCallbackRef}
        tabIndex={-1}
        style={DIALOG_BODY_STYLE}
        className={cn(
          "overflow-y-auto flex-1 min-h-0",
          "px-6 pt-2 pb-4",
          // outline-none: tabIndex={-1} is scroll-management only; base.css *:focus-visible owns the ring.
          "outline-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const scrolledBottom = React.useContext(DialogScrollBottomContext)

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        overlayPanelFooterBase,
        scrolledBottom && overlayPanelFooterScrolled,
        className
      )}
      {...props}
    />
  )
}

function DialogCancelButton({
  children = "Cancel",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <DialogPrimitive.Close asChild>
      <Button variant="secondary" {...props}>
        {children}
      </Button>
    </DialogPrimitive.Close>
  )
}

function DialogConfirmButton({
  children = "Confirm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="primary" {...props}>
      {children}
    </Button>
  )
}

function DialogDestructiveButton({
  children = "Delete",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="destructive" {...props}>
      {children}
    </Button>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDestructiveButton,
  dialogContentVariants,
}
