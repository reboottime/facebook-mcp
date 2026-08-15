# Fix Locality

Where a visual or behavior fix lands, decided by consumer count and intent — not by where the bug happened to surface.

- **Single consumer** → fix at the callsite. One app-level component or one screen uses the pattern; a shared abstraction for one caller is speculative generality, not reuse.
- **≥2 consumers, identical intent** → fix in the shared primitive (`packages/ui/**`) or a pattern doc. "Identical intent" means the same visual/behavioral contract, not merely the same-looking JSX by coincidence — two callers that happen to render similarly but serve different purposes stay separate.
- **Theme** → design-system-level semantic tokens only (`packages/ui/src/styles/**`). A theme fix changes a token value everyone inherits; it is never the right layer for a single surface's one-off need — that's app-scoped tokens or a component prop instead.

When in doubt, count consumers before choosing a layer. Fixing at too broad a layer (theme when one screen needed it) risks unrelated-surface regressions — see [`cross-screen-audit.md`](../../.claude/workflows/cross-screen-audit.md) and the PR self-review's non-skippable token/theme step. Fixing at too narrow a layer (callsite when ≥2 consumers share intent) duplicates the fix and lets copies drift.
