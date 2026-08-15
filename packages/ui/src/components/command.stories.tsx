import { useEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import {
  FlaskConicalIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
  TerminalIcon,
  PlayIcon,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command"

const meta: Meta<typeof Command> = {
  title: "Components/Command",
  component: Command,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof meta>

// ── Playground ────────────────────────────────────────────────────────────────
// Minimal shell — flat group, no separator, no disabled rows.
// Starting point for API exploration; covers input wrapper focus ring behavior.

export const Playground: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Command>
        <CommandInput placeholder="Search commands…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>
              <PlayIcon />
              Run evaluation
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <PlusIcon />
              New environment
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <FlaskConicalIcon />
              View traces
            </CommandItem>
            <CommandItem>
              <LayoutDashboardIcon />
              Dashboard
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
}

// ── Variants ──────────────────────────────────────────────────────────────────
// Canonical anatomy: grouped sections, shortcuts, separator.
// Matches the spec diagram exactly — ACTIONS group with shortcuts, NAVIGATION group.

export const Variants: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Command>
        <CommandInput placeholder="Search commands…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>
              <PlayIcon />
              Run evaluation
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <PlusIcon />
              New environment
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem disabled>
              <FlaskConicalIcon />
              View traces
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem>
              <LayoutDashboardIcon />
              Dashboard
            </CommandItem>
            <CommandItem>
              <TerminalIcon />
              Terminal
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
}

// ── EmptyState ────────────────────────────────────────────────────────────────
// CommandEmpty renders when no items match the current filter query.
// cmdk controls its own search state via React context — defaultValue on the
// input writes to the DOM attribute but does NOT seed cmdk's internal search,
// so items remain unfiltered and CommandEmpty stays hidden. To show the empty
// state on initial render we must use controlled mode: value + onValueChange
// on CommandInput, initialized to a query that matches nothing.

function EmptyStateExample() {
  const [query, setQuery] = useState("xyzzy")
  return (
    <div style={{ width: 400 }}>
      <Command>
        <CommandInput
          placeholder="Search commands…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No commands match your search.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem value="run-evaluation">
              <PlayIcon />
              Run evaluation
            </CommandItem>
            <CommandItem value="new-environment">
              <PlusIcon />
              New environment
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

export const EmptyState: Story = {
  render: () => <EmptyStateExample />,
}

// ── EmptyStateDefault ─────────────────────────────────────────────────────────
// CommandEmpty with no children — renders the default EmptyState component
// (variant="no-results" size="sm" title="No results"). This is the new default
// behavior after the CommandEmpty update.

function EmptyStateDefaultExample() {
  const [query, setQuery] = useState("xyzzy")
  return (
    <div style={{ width: 400 }}>
      <Command>
        <CommandInput
          placeholder="Search commands…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty />
          <CommandGroup heading="Actions">
            <CommandItem value="run-evaluation">
              <PlayIcon />
              Run evaluation
            </CommandItem>
            <CommandItem value="new-environment">
              <PlusIcon />
              New environment
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

export const EmptyStateDefault: Story = {
  render: () => <EmptyStateDefaultExample />,
}

// ── Dialog ────────────────────────────────────────────────────────────────────
// Mirrors the app-shell pattern: a search trigger in a faux topbar opens the
// CommandDialog. Useful for seeing the overlay backdrop blur, enter/exit
// motion, and the relative stacking of overlay vs panel — none of which the
// inline Command stories can show.
//
// The dialog is portaled to document.body. Storybook's iframe is its own
// document, so the overlay covers the iframe (the surrounding faux page),
// not Storybook's chrome.

function CommandDialogDemo() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      const isCmdK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const isSlash =
        !event.metaKey && !event.ctrlKey && !event.altKey && event.key === "/" && !isEditable
      if (isCmdK || isSlash) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="min-h-[640px] bg-canvas-base text-foreground p-6">
      <header className="flex items-center gap-3 border-b border-border pb-4 mb-6">
        <span className="typography-subtitle font-semibold">Sandboxes</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          aria-keyshortcuts="/ Meta+K Control+K"
          className="ml-auto flex h-8 w-72 cursor-pointer items-center gap-2 rounded-lg border border-form-field-border bg-field-rest px-2.5 typography-body text-muted-foreground hover:bg-form-field-surface hover:text-foreground"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden />
          <span className="flex flex-1 items-center gap-1 text-left">
            Type
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted-surface px-1 font-mono typography-meta text-muted-foreground">
              /
            </kbd>
            to search
          </span>
        </button>
      </header>

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 typography-body"
          >
            <span>sandbox-{String(i + 1).padStart(2, "0")}</span>
            <span className="text-muted-foreground typography-meta">RUNNING</span>
          </div>
        ))}
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} label="Command palette">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty />
          <CommandGroup heading="Suggestions">
            <CommandItem value="all-resources" onSelect={() => setOpen(false)}>
              <LayoutGridIcon />
              All resources
              <CommandShortcut>⌘⇧A</CommandShortcut>
            </CommandItem>
            <CommandItem value="how-to-get-started" onSelect={() => setOpen(false)}>
              <HelpCircleIcon />
              How to get started?
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem value="run-evaluation" onSelect={() => setOpen(false)}>
              <PlayIcon />
              Run evaluation
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
            <CommandItem value="new-environment" onSelect={() => setOpen(false)}>
              <PlusIcon />
              New environment
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}

export const Dialog: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <CommandDialogDemo />,
}
