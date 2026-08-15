/**
 * Shared class-string constants for overlay panel anatomy.
 *
 * Dialog and Drawer compose these to keep surface, padding, and typography
 * visually identical. Backdrop tokens and positioning stay component-local.
 *
 * Usage:
 *   import { overlayPanelSurface, overlayPanelHeaderBase, ... } from "@repo/ui/lib/overlay-panel"
 *   className={cn(overlayPanelHeaderBase, scrolled && overlayPanelHeaderScrolled)}
 */

/** Panel background — modal elevation tier (bg-card). */
export const overlayPanelSurface = "bg-card"

/**
 * Header base — z/shrink/inset padding, stable bottom border.
 * Does NOT include flex-direction — Dialog uses flex-col (absolute close button
 * lives outside header's flex context); Drawer uses flex-row justify-between
 * (in-flow close button on the right). Each component adds its own flex layout.
 * The border is always rendered (border-transparent when not scrolled) so the
 * box model never shifts by 1px on state change.
 * Scroll-cue transition is included; the toggled class is overlayPanelHeaderScrolled.
 */
export const overlayPanelHeaderBase = [
  "relative z-sticky",
  "shrink-0",
  "pt-6 pb-3 px-6",
  "border-b border-transparent shadow-none",
  // T2 — prop-(--motion-state-change) sets transition-property not duration; explicit tokens resolve correctly
  "transition-[border-color,box-shadow] duration-fast ease-out-standard",
].join(" ")

/**
 * Applied in addition to overlayPanelHeaderBase when the body is scrolled away
 * from the top — reveals the scroll-cue border + shadow.
 */
export const overlayPanelHeaderScrolled = "border-border shadow-scroll-cue"

/**
 * Body wrapper — fills remaining height, clips overflow for scroll tracking.
 * The inner scroll container (px-6 pt-2 pb-4) stays component-local because
 * Dialog adds scrollbarGutter and tabIndex={-1} while Drawer adds a focus-visible
 * outline suppression; both use DRAWER/DIALOG_BODY_STYLE inline.
 */
export const overlayPanelBody = "flex flex-1 flex-col min-h-0 text-foreground"

/**
 * Footer base — flex row, right-aligned, inset padding, stable top border.
 * Scroll-cue transition included; toggled class is overlayPanelFooterScrolled.
 */
export const overlayPanelFooterBase = [
  "flex flex-row items-center justify-end shrink-0",
  "gap-2",
  "pt-3 pb-4 px-6",
  "border-t border-transparent shadow-none",
  // T2 — prop-(--motion-state-change) sets transition-property not duration; explicit tokens resolve correctly
  "transition-[border-color,box-shadow] duration-fast ease-out-standard",
].join(" ")

/**
 * Applied in addition to overlayPanelFooterBase when the body is scrolled away
 * from the bottom — reveals the inverted scroll-cue border + shadow.
 */
export const overlayPanelFooterScrolled = "border-border shadow-scroll-cue-inverted"

/**
 * Title — subtitle size (16px) semibold, foreground color, no leading.
 * Uses the rank-3 font-size pattern to avoid twMerge text-color conflicts.
 */
export const overlayPanelTitle =
  // eslint-disable-next-line no-restricted-syntax -- [length:var(--x)] is the permitted rank-3 font-size pattern; avoids twMerge text-color conflict
  "text-[length:var(--typography-subtitle)] font-semibold text-foreground leading-none"

/**
 * Description — body size (14px), muted foreground.
 * No margin — header gap-1 owns the rhythm between title and description.
 */
export const overlayPanelDescription = "typography-body text-muted-foreground"
