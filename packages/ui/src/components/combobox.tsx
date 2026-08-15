// shadcn-source: radix-wrap:PopoverPrimitive+cmdk (n/a, 2026-05-28)
"use client"

import * as React from "react"
import { ChevronsUpDownIcon, CheckIcon, XIcon } from "lucide-react"
import { matchSorter, rankings } from "match-sorter"
import { Popover as PopoverPrimitive } from "radix-ui"
import {
  Command as CommandPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandList as CommandListPrimitive,
  useCommandState,
} from "cmdk"

import { cn } from "@repo/ui/lib/cn"
import { formFieldBoxVariants } from "@repo/ui/lib/form-field-box"
import { CommandGroup, CommandItem } from "@repo/ui/components/command"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComboboxOption = { value: string; label: string; disabled?: boolean }
export type ComboboxGroup = { heading: string; options: ComboboxOption[] }

type ComboboxPropsBase = {
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  size?: "sm" | "md"
  className?: string
  /** Muted dimension prefix in trigger: "Role" (no value) or "Role: Owner" (value set). Visual only — does not affect input value. */
  label?: string
  /** Custom row renderer. Return content left of the checkmark; Combobox owns the checkmark. Use `ComboboxTwoLineOption` for two-line rows. */
  renderOption?: (option: ComboboxOption) => React.ReactNode
}

export type ComboboxProps =
  | (ComboboxPropsBase & { options: ComboboxOption[]; groups?: never })
  | (ComboboxPropsBase & { groups: ComboboxGroup[]; options?: never })

// Internal shape that erases discriminated union strictness for destructuring
type ComboboxInternalProps = ComboboxPropsBase & {
  options?: ComboboxOption[]
  groups?: ComboboxGroup[]
}

export interface ComboboxTwoLineOptionProps {
  /** Primary text — body/medium/foreground. Truncates. */
  primary: string
  /** Secondary text — meta/normal/muted-foreground. Wraps. */
  secondary: string
}

/** Two-line row layout for use inside `renderOption`. Combobox owns the surrounding item + checkmark. */
export function ComboboxTwoLineOption({ primary, secondary }: ComboboxTwoLineOptionProps) {
  return (
    <span className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
      <span className="typography-body font-medium text-foreground truncate w-full">{primary}</span>
      <span className="typography-meta font-normal text-muted-foreground">{secondary}</span>
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelFor(value: string | null, opts: ComboboxOption[]): string {
  if (value === null) return ""
  return opts.find((o) => o.value === value)?.label ?? ""
}

function flattenGroups(groups: ComboboxGroup[]): ComboboxOption[] {
  return groups.flatMap((g) => g.options)
}

function useFilteredFlat(options: ComboboxOption[], query: string): ComboboxOption[] {
  return React.useMemo(() => {
    if (query === "") return options
    return matchSorter(options, query, { threshold: rankings.CONTAINS, keys: ["label", "value"] })
  }, [options, query])
}

function useFilteredGroups(groups: ComboboxGroup[], query: string): ComboboxGroup[] {
  return React.useMemo(() => {
    if (query === "") return groups
    return groups
      .map((g) => ({
        ...g,
        options: matchSorter(g.options, query, { threshold: rankings.CONTAINS, keys: ["label", "value"] }),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, query])
}

// ── TriggerInput — nested inside Command to access useCommandState ─────────────

interface TriggerInputProps extends Omit<React.ComponentProps<"input">, "size" | "ref"> {
  query: string
  onQueryChange: (q: string) => void
  open: boolean
  size?: "sm" | "md"
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Ref to the trigger's outer box — the Popover anchor measures this element, not the input, so the popover matches the full visual trigger width (not just the input's inset width). */
  wrapperRef: React.RefObject<HTMLDivElement | null>
  listboxId: string | undefined
  activeItemId: string | undefined
  dimensionLabel?: string
  hasValue: boolean
  onClear: () => void
}

const TriggerInput = React.forwardRef<HTMLInputElement, TriggerInputProps>(
  ({ query, onQueryChange, open, size = "md", className, inputRef, wrapperRef,
     listboxId, activeItemId, onKeyDownCapture, onBlur, onFocus, disabled, placeholder,
     dimensionLabel, hasValue, onClear, ...rest }, ref) => {
    const highlightedValue = useCommandState((s) => s.value)
    const derivedActiveItemId = activeItemId ?? (highlightedValue || undefined)

    const [isHovered, setIsHovered] = React.useState(false)
    const [isFocusedInside, setIsFocusedInside] = React.useState(false)

    // Hidden while popover is open (backspace-to-clear covers that path).
    const showClear = hasValue && !open && (isHovered || isFocusedInside)

    const mergeRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
      },
      [ref] // eslint-disable-line react-hooks/exhaustive-deps
    )

    // mousedown preventDefault cancels input blur (no 150ms close race window on clear).
    const handleClearMouseDown = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault() }, [])
    const handleClearClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onClear() }, [onClear])

    return (
      <div
        ref={wrapperRef}
        data-slot="combobox-trigger-wrapper"
        data-state={open ? "open" : "closed"}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocusedInside(true)}
        onBlur={() => setIsFocusedInside(false)}
        className={cn(
          // Box recipe aligned with Select/Input — bg, border, radius, sizing, transition.
          // formFieldBoxVariants targets native elements (disabled:, aria-invalid:) which are
          // dead weight on a div — handled below via has-[] and the disabled conditional.
          formFieldBoxVariants({ size }),
          "relative flex w-full items-center",
          // Keyboard-focus bg lift (focus-visible: only, not focus: — mouse clicks don't lift).
          "has-[input:focus-visible]:bg-form-field-surface",
          // Open state: bg lift + focus ring (matches Select's data-[state=open] treatment).
          "data-[state=open]:bg-form-field-surface data-[state=open]:shadow-focus-ring",
          // Validation border — div can't use aria-invalid: directly, use has-[] selector.
          "has-[input[aria-invalid='true']]:border-state-errored",
          disabled && "cursor-not-allowed bg-form-field-disabled",
          className,
        )}
      >
        {dimensionLabel && (
          <span aria-hidden="true" className={cn("shrink-0 select-none typography-body text-muted-foreground whitespace-nowrap pr-1", size === "md" ? "pl-2.5" : "pl-2")}>
            {hasValue ? `${dimensionLabel}:` : dimensionLabel}
          </span>
        )}

        <input
          ref={mergeRef}
          data-slot="combobox-trigger"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={derivedActiveItemId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={dimensionLabel && hasValue ? "" : placeholder}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDownCapture={onKeyDownCapture}
          onBlur={onBlur}
          onFocus={onFocus}
          data-state={open ? "open" : "closed"}
          className={cn(
            "flex min-w-0 flex-1 items-center bg-transparent outline-none",
            // Wrapper owns the focus/open ring (data-[state=open]:shadow-focus-ring).
            // Suppress the global *:focus-visible box-shadow on the input to avoid a stacked double ring.
            "focus-visible:shadow-none",
            !dimensionLabel && (size === "md" ? "pl-2.5" : "pl-2"),
            size === "md" ? "pr-8" : "pr-7",
            "typography-body text-foreground placeholder:text-meta-foreground",
            "disabled:cursor-not-allowed disabled:text-muted-foreground",
          )}
          {...rest}
        />

        {/* Chevron ↔ X cross-fade — same right-2.5 anchor, no layout shift */}
        <ChevronsUpDownIcon
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-2.5 size-4 shrink-0 text-muted-foreground",
            "transition-opacity duration-fast ease-out-standard",
            showClear ? "opacity-0" : "opacity-mid",
          )}
        />

        {hasValue && (
          <button
            type="button"
            tabIndex={showClear ? 0 : -1}
            aria-label={`Clear ${dimensionLabel ?? "selection"}`}
            onMouseDown={handleClearMouseDown}
            onClick={handleClearClick}
            disabled={disabled}
            className={cn(
              "absolute right-2.5 z-10 flex items-center justify-center rounded",
              "text-muted-foreground",
              "transition-opacity duration-fast ease-out-standard",
              showClear
                ? "pointer-events-auto opacity-mid hover:opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <XIcon aria-hidden="true" className="size-4 shrink-0" />
          </button>
        )}
      </div>
    )
  }
)
TriggerInput.displayName = "ComboboxTriggerInput"

// ── Combobox ──────────────────────────────────────────────────────────────────

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>((props, ref) => {
  const {
    value, onValueChange, placeholder, emptyText, disabled = false, size = "md",
    className, options: optionsProp = [], groups: groupsProp, renderOption, label,
  } = props as ComboboxInternalProps

  const allOptions = React.useMemo(
    () => (groupsProp ? flattenGroups(groupsProp) : optionsProp),
    [groupsProp, optionsProp]
  )

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(() => labelFor(value, allOptions))

  const initialValueRef = React.useRef<string | null>(value)
  const committedRef = React.useRef(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  // Popover anchor measurement target — the visual trigger box, not the input (see TriggerInput.wrapperRef).
  const triggerWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const openRef = React.useRef(false)
  // Suppresses the next handleFocus popover-open after a clear action refocuses the input.
  const suppressNextOpenRef = React.useRef(false)
  const [listboxId, setListboxId] = React.useState<string | undefined>(undefined)

  // External value sync — query and initialValueRef drift to new external value
  const prevValueRef = React.useRef<string | null | undefined>(undefined)
  React.useEffect(() => {
    if (prevValueRef.current === undefined) { prevValueRef.current = value; return }
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      setQuery(labelFor(value, allOptions))
      initialValueRef.current = value
    }
  }, [value, allOptions])

  // Close path: revert if uncommitted
  const runClosePath = React.useCallback(() => {
    if (!committedRef.current) {
      onValueChange(initialValueRef.current)
      setQuery(labelFor(initialValueRef.current, allOptions))
    }
    committedRef.current = false
  }, [onValueChange, allOptions])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        initialValueRef.current = value
        committedRef.current = false
        openRef.current = true
        setOpen(true)
      } else {
        openRef.current = false
        runClosePath()
        setOpen(false)
      }
    },
    [value, runClosePath]
  )

  // After open, read cmdk list id for aria-controls
  React.useEffect(() => {
    if (!open) { setListboxId(undefined); return }
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector("[cmdk-list]")
      if (el) {
        let id = el.getAttribute("id")
        if (!id) { id = `combobox-list-${Math.random().toString(36).slice(2, 9)}`; el.setAttribute("id", id) }
        setListboxId(id)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Commit path
  const commit = React.useCallback(
    (option: ComboboxOption) => {
      onValueChange(option.value)
      setQuery(option.label)
      committedRef.current = true
      openRef.current = false
      setOpen(false)
    },
    [onValueChange]
  )

  // Query change — backspace-to-empty fires intermediate null
  const handleQueryChange = React.useCallback(
    (q: string) => {
      setQuery(q)
      if (q === "") onValueChange(null)
      if (!openRef.current) {
        initialValueRef.current = value
        committedRef.current = false
        openRef.current = true
        setOpen(true)
      }
    },
    [value, onValueChange]
  )

  // 150ms race window: keeps popover open across item-click. openRef reads current state.
  const handleBlur = React.useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      if (!openRef.current) return
      openRef.current = false
      runClosePath()
      setOpen(false)
    }, 150)
  }, [runClosePath])

  const handleFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null }
    if (suppressNextOpenRef.current) { suppressNextOpenRef.current = false; return }
    if (!openRef.current) {
      initialValueRef.current = value
      committedRef.current = false
      openRef.current = true
      setOpen(true)
    }
  }, [value])

  // Click on an already-focused input doesn't re-fire focus, so handleFocus can't
  // re-open after handleClear's refocus-and-suppress. Click handler covers that gap.
  const handleInputClick = React.useCallback(() => {
    if (!openRef.current) {
      initialValueRef.current = value
      committedRef.current = false
      openRef.current = true
      setOpen(true)
    }
  }, [value])

  React.useEffect(() => () => { if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current) }, [])

  // Clear: mousedown on X already preventDefault()d the blur, so no close race window.
  // suppressNextOpenRef prevents the refocus-triggered focus handler from re-opening.
  const handleClear = React.useCallback(() => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null }
    onValueChange(null)
    setQuery("")
    initialValueRef.current = null
    committedRef.current = false
    openRef.current = false
    suppressNextOpenRef.current = true
    requestAnimationFrame(() => { inputRef.current?.focus() })
  }, [onValueChange])

  const filteredFlat = useFilteredFlat(optionsProp, query)
  const filteredGroups = useFilteredGroups(groupsProp ?? [], query)
  const firstFilteredItem = groupsProp
    ? filteredGroups.flatMap((g) => g.options).find((o) => !o.disabled)
    : filteredFlat.find((o) => !o.disabled)

  // ArrowDown opens; Enter with no cmdk highlight commits first item
  const handleKeyDownCapture = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!openRef.current) { initialValueRef.current = value; committedRef.current = false; openRef.current = true; setOpen(true); e.preventDefault() }
        return
      }
      if (e.key === "Enter" && openRef.current) {
        const highlighted = document.querySelector("[cmdk-item][aria-selected=true]")
        if (!highlighted && firstFilteredItem) { e.preventDefault(); commit(firstFilteredItem) }
      }
    },
    [value, firstFilteredItem, commit]
  )

  // py-2 override: two-line rows need extra height (single-line default is py-1.5).
  const renderItems = (items: ComboboxOption[]) =>
    items.map((option) => (
      <CommandItem
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        role="option"
        id={option.value}
        aria-selected={value === option.value}
        onMouseDown={(e) => e.preventDefault()}
        onSelect={() => commit(option)}
        className={cn(renderOption && "py-2")}
      >
        {renderOption
          ? renderOption(option)
          : <span className="flex-1 truncate">{option.label}</span>
        }
        <CheckIcon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 self-center",
            value === option.value ? "opacity-100" : "opacity-0",
          )}
        />
      </CommandItem>
    ))

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <CommandPrimitive
        shouldFilter={false}
        className="relative w-full"
      >
        {/* virtualRef anchors positioning to the trigger's outer box (measured via wrapperRef) instead of
            relying on asChild's ref-merge, which would resolve to whatever DOM node TriggerInput's own
            forwardRef targets (the input) — narrower than the visible trigger. Renders no DOM of its own. */}
        <PopoverPrimitive.Anchor
          virtualRef={triggerWrapperRef as React.RefObject<{ getBoundingClientRect(): DOMRect }>}
        />
        <TriggerInput
          ref={ref}
          query={query}
          onQueryChange={handleQueryChange}
          open={open}
          placeholder={placeholder}
          disabled={disabled}
          size={size}
          className={className}
          onKeyDownCapture={handleKeyDownCapture}
          inputRef={inputRef}
          wrapperRef={triggerWrapperRef}
          listboxId={listboxId}
          activeItemId={undefined}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onClick={handleInputClick}
          dimensionLabel={label}
          hasValue={value !== null}
          onClear={handleClear}
        />

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            data-slot="combobox-content"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Anchor mode: Radix's targetIsTrigger guard doesn't fire. Guard the input
              // ourselves — preventDefault stops DismissableLayer from closing on input clicks.
              const target = e.target as Node | null
              if (inputRef.current?.contains(target) || inputRef.current === target) {
                e.preventDefault(); return
              }
              handleOpenChange(false)
            }}
            onEscapeKeyDown={(e) => { e.preventDefault(); handleOpenChange(false) }}
            align="start"
            sideOffset={8}
            style={{ width: "var(--radix-popover-trigger-width)" }}
            className={cn(
              // No border — shadow-popover has a built-in 1px ring; a CSS border creates a perceived double-edge.
              "z-overlay overflow-hidden rounded-lg",
              "bg-popover text-foreground shadow-popover outline-none p-1",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
              "data-[state=closed]:data-[side=bottom]:slide-out-to-top-0.5",
              "data-[state=closed]:data-[side=top]:slide-out-to-bottom-0.5",
            )}
          >
            <CommandListPrimitive
              data-slot="combobox-list"
              role="listbox"
              className="max-h-[360px] scroll-py-1 overflow-x-hidden overflow-y-auto"
            >
              <CommandEmptyPrimitive className="py-6 text-center typography-body text-muted-foreground">
                {emptyText ?? "No results found."}
              </CommandEmptyPrimitive>

              {groupsProp
                ? filteredGroups.map((group) => (
                    <CommandGroup
                      key={group.heading}
                      heading={group.heading}
                    >
                      {renderItems(group.options)}
                    </CommandGroup>
                  ))
                : renderItems(filteredFlat)}
            </CommandListPrimitive>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </CommandPrimitive>
    </PopoverPrimitive.Root>
  )
})

Combobox.displayName = "Combobox"
