# Composition Over Configuration

Before adding a `variant` / `mode` / `kind` / `type` / `layout` prop, or a boolean like `isX` / `showY` / `hideZ` / `compact` / `readonly`, ask: **does this switch which children render, which layout is used, or which branch of logic runs?** If yes — split into separate components (or named functions, for non-rendering code) that accept `children` / render-props, instead of gating new behavior behind a prop on one component. Do not keep one component and add a flag for new behavior, **especially when refactoring**.

## Red flags

- Two `if (mode === …)` branches in one render body returning different JSX trees.
- A prop whose only job is to toggle a section on/off — that section belongs to the caller.
- "I'll just add one flag" while consolidating two similar components — those are two components, keep them two.
- Boolean props multiplying (`showHeader`, `showFooter`, `showImage`) — the caller should compose the parts it wants.
- In non-rendering code: a `mode` / `kind` param that switches which branch of logic runs inside one function — split into two named functions instead.

## Before / after

```tsx
// ✗ configuration
<Card variant="horizontal" showImage showFooter={false} />
<NoteDetail mode="fullscreen" readonly />

// ✓ composition
<Card>
  <CardImage src={img} />
  <CardBody>{content}</CardBody>
</Card>
<FullscreenNoteDetail note={note} />   // separate component, not a mode
```

## Narrow exception — leaf primitives

Enum props on **leaf primitives** where every variant renders the **same structural tree** and only visual tokens change are fine: `<Button variant="primary|ghost">`, `<Text size="sm|md|lg">`. If the tree or children differ, it's not an exception — split.

## Where this is enforced

- `staff-frontend-engineer`, `design-system-architect`, `library-engineer` — hard rule at implementation time.
- `frontend-reviewer` — FAIL condition at review time (checklist §4).
- Orchestrator — reject-and-reroute rule in [`CLAUDE.md`](../../CLAUDE.md) → Engineering rules; send back "split it."
