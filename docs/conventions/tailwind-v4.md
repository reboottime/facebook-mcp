# Tailwind v4 Conventions

## Token-form precedence

Three forms, in priority order:

1. **Rank 1 — generated utility** (`bg-card`, `text-foreground`, `border-border`, `gap-4`). Use whenever a `@theme` token generates a matching utility. This is the default.
2. **Rank 2 — `prop-(--x)`** (`prop-(--sidebar-width)`). Use for `:root`-only CSS custom properties that do not have a generated utility counterpart.
3. **Rank 3 — `[var(--x)]` arbitrary syntax**. Never use. Reviewer FAILs this form.

---

## No dark mode utilities

This product has no dark theme. Do not use `dark:*` Tailwind variants.

---

## Typography utilities

Use `typography-*` utilities (`typography-body`, `typography-label`, …) for all typography-role declarations. Do not use `text-*` for typography — the namespace is overloaded (color, size, alignment, decoration) and collides with `tailwind-merge` class grouping.

Full layer split, role-vs-size rule, and quick reference table: [`docs/conventions/typography-utility-usage.md`](./typography-utility-usage.md).
