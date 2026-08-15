# Comments — WHY-only

Default: no comments. Add one only when it captures something the code cannot say — a hidden invariant, a non-local constraint, a workaround for a specific upstream bug, or behavior that would surprise a reader. Restating what the code obviously does is a violation, not a kindness.

Test: if deleting the comment would leave a future reader equally informed, delete it.

## Red flags (FAIL on review)

- **No historical / stale references.** Comments must describe the code as it is, not how it got here. Trigger words: `pre-extraction`, `pre-refactor`, `previously`, `used to`, `was moved`, `was extracted`, `after the refactor`, `before we`, `since we extracted`, `now renders` / `now lives` / `now owns` / `now handles`, `matches the old`, `matches the pre-`, `restored from`, `legacy`.
- **No task/PR/issue/caller references.** `added for the X flow`, `used by Y`, `from issue #123`, `per ticket ABC-456`, `requested by Z`, `see PR #N`. Belongs in the commit / PR description, not source.
- **No WHAT comments.** If the comment paraphrases the next line(s) of code (`// loop over users`, `// open the drawer`, `// reset draft state`), delete — identifiers already convey WHAT.
- **No canon-citation comments.** A comment whose only job is to cite a canon doc justifying a value (`// see spacing.md`, `// per token-policy.md`) is noise, not a WHY — grep is the citation. Stricter than the general WHY rule: even a comment that correctly points at ground truth still gets removed if its sole content is the citation. State the invariant itself if it's non-obvious; drop the pointer.
- **No "we do X instead of Y" justifications for absent alternatives.** If a reader has no reason to suspect an alternative existed, explaining its absence is noise. Exception: the alternative is something a reader would actively reach for and break (e.g., `// not useEffect — must run sync to avoid flash`).
- **No section banner comments.** `// --- Handlers ---`, `// State`, `// Effects`, `// Render`. Structure conveys structure.
- **No JSDoc on internal or framework-convention exports.** Multi-line `/** … */` blocks describing layout, assembly, or which child renders where on internal components are a violation — JSX is the source of truth. Framework-convention exports (Next.js `proxy` / `middleware` / `page` / `layout` / `default` route handlers) are NOT "external callers" — the framework loads them by name, not by docstring. JSDoc is reserved for shared primitives in `packages/ui/` and exported app-level utilities/types where the docstring drives editor IntelliSense for human callers.

## Acceptable comments (do not flag)

Single-line notes that name a non-obvious invariant (`// must run before X — writes are racy otherwise`), a workaround tied to a specific upstream bug (`// workaround for radix-ui#1234`), an external contract not visible locally (`// API returns dates in UTC; localize before render`), or a hidden ordering constraint enforced by the runtime.

When in doubt: would deleting this comment cause a future reader to misunderstand the code or break it? If no — remove it. If yes — keep it, and verify the wording is timeless (no `now`, no `previously`, no PR numbers, no bare doc citation).
