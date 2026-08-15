// Shared base classes for Button + IconButton. Size/shape variants are injected
// by each component.
//
// aria-disabled is treated as disabled (cursor + visual) but stays focusable —
// keeps tooltips and screen-reader announcements working. Loading is "busy but
// valid" (Mantine/Primer pattern) — disabled selectors guard with :not([data-loading])
// so loading keeps the default cursor + variant bg.
export const buttonBaseClasses = [
  "inline-flex shrink-0 items-center justify-center",
  "cursor-pointer",
  "whitespace-nowrap",
  "font-sans",
  "transition-colors duration-150",
  "disabled:[&:not([data-loading])]:cursor-not-allowed",
  "aria-disabled:[&:not([data-loading])]:cursor-not-allowed",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
] as const
