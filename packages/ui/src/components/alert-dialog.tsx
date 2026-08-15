// shadcn-source: https://ui.shadcn.com/docs/components/alert-dialog (cli, 2026-06-28)
"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { cn } from "@repo/ui/lib/cn"
import {
  overlayPanelDescription,
  overlayPanelFooterBase,
  overlayPanelHeaderBase,
  overlayPanelSurface,
  overlayPanelTitle,
} from "@repo/ui/lib/overlay-panel"
import { Button, type ButtonProps } from "@repo/ui/components/button"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
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

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          // Positioning — always centered (no mobile-sheet variant; alertdialog demands immediate response)
          "fixed top-1/2 left-1/2 z-overlay -translate-x-1/2 -translate-y-1/2",
          "flex flex-col w-full",
          "max-w-[min(480px,calc(100vw-2rem))]",
          // Surface — no border; shadow-modal provides the 0 0 0 1px ring + halo
          overlayPanelSurface,
          "shadow-modal rounded-lg",
          // outline-none: focus managed by Radix; panel is not itself a focus target
          "outline-none",
          // Motion — matches Dialog enter/exit
          "data-[state=open]:animate-slide-up-in",
          "data-[state=closed]:animate-slide-down-out",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "flex flex-col gap-1",
        overlayPanelHeaderBase,
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(overlayPanelFooterBase, className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(overlayPanelTitle, className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(overlayPanelDescription, className)}
      {...props}
    />
  )
}

export interface AlertDialogActionProps
  extends React.ComponentProps<typeof AlertDialogPrimitive.Action> {
  /** Visual intent of the action button. Defaults to "destructive" — the common case for this primitive. */
  variant?: ButtonProps["variant"]
}

function AlertDialogAction({
  className,
  variant = "destructive",
  ...props
}: AlertDialogActionProps) {
  return (
    <Button variant={variant} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <Button variant="secondary" asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
