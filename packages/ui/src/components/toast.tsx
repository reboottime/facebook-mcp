"use client"

// shadcn-source: https://ui.shadcn.com/docs/components/sonner (cli, 2026-05-26)
//
// All visual overrides live in styles/components/toast.css — sonner's own
// stylesheet sits at [0,2,1] specificity, so a co-located component CSS file
// using compounded `[data-sonner-toaster] [data-sonner-toast] …` selectors
// ([0,3,1]) wins without `!important`. Keep this component thin: theme +
// behavior only; visuals belong in the stylesheet.
import {
  CircleCheckIcon,
  InfoIcon,
  LoaderIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      closeButton
      // Why: swipe-to-dismiss is misleading — close-X is the intended path.
      swipeDirections={[]}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <LoaderIcon className="size-4 animate-spin text-muted-foreground" />,
      }}
      // Sonner hardcodes z-index:999999999 on its root; inline style overrides
      // it without a specificity fight.
      style={{ zIndex: "var(--z-toast)" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
