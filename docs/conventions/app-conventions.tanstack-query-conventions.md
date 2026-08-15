# Query Keys

Tanstack Query v5 key conventions for cache management and invalidation in the Listo portal. The shape is tenancy-first because workspaces depend on user and resources depend on workspace — switching user or workspace must drop every dependent cache entry in one prefix invalidation.

## Principle

`account → workspace → resource`. The first segment is always `'account'`; the second is the `accountId`; workspace-scoped resources live under a `'workspace'` segment. Invalidating any ancestor key cascades to everything below.

## Key Structure

```
['account']                                                       — root (all accounts)
['account', 'list']                                               — list of accounts the user belongs to
['account', accountId]                                            — account scope (cascade root for the active account)
['account', accountId, 'members' | 'billing' | 'credits' | 'usage'
                       | 'limits' | 'secrets' | 'org-api-keys'
                       | 'org-address']                           — account-level domain
['account', accountId, 'workspaces']                              — list of workspaces in this account
['account', accountId, 'workspace', wsId]                         — workspace scope (cascade root for this workspace)
['account', accountId, 'workspace', wsId, 'resources']            — every resource list/detail under wsId
['account', accountId, 'workspace', wsId, 'resources', type,
                       'list', filters]                           — list of resources of `type`, scoped to `filters`
['account', accountId, 'workspace', wsId, 'resources', type,
                       'detail', id]                              — single resource of `type` with `id`
```

`accountId` is always second; `workspaceId` always appears under the literal `'workspace'` segment; resource types live under `'resources'`. The filters object is the tail of every list key so a filtered variant lives under the same `'list'` prefix as the unfiltered one and falls out on cascade.

## Cascade Table

| Invalidate                            | Drops                                                       |
| ------------------------------------- | ----------------------------------------------------------- |
| `queryKeys.all`                       | Everything (every account, every workspace, every resource) |
| `queryKeys.account(accountId)`        | Active account + all workspaces and their resources         |
| `queryKeys.workspace(accountId, wsId)`| Every list and detail under that workspace                  |
| `queryKeys.resources(accountId, wsId)`| Every resource list and detail under that workspace         |
| `queryKeys.resourceList(a, w, type)`  | All filtered variants of `type` in this workspace           |
| `queryKeys.members(accountId)`        | The members domain for this account                         |

Use the most specific prefix the mutation response justifies. If a mutation returns `accountId` you invalidate at the account level; if it returns `accountId + workspaceId` you invalidate at the workspace level; if it returns the resource id you invalidate `resourceDetail`.

## Key Factory

`apps/portal/src/lib/query/keys.ts` is the single source of truth. Never hand-construct a key inline — every consumer goes through `queryKeys.*` so prefix invalidation always works.

```ts
import { queryKeys } from "@/lib/query/keys";

queryKeys.members(accountId);                         // ['account', accountId, 'members']
queryKeys.resourceList(accountId, wsId, 'sandboxes'); // ['account', accountId, 'workspace', wsId, 'resources', 'sandboxes', 'list', {}]
queryKeys.resourceDetail(accountId, wsId, 'sandboxes', id);
```

## queryOptions per domain

One file per domain at `apps/portal/src/lib/query/{domain}.ts`. Each file exports a `{domain}Queries` object containing `queryOptions(...)` factories. The same factory is consumed by server prefetch and client `useQuery` — never duplicate the definition.

```ts
// apps/portal/src/lib/query/sandboxes.ts
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import { fetchSandboxes } from "@/lib/mock/sandboxes";

export const sandboxQueries = {
  list: (accountId: string, workspaceId: string) =>
    queryOptions({
      queryKey: queryKeys.resourceList(accountId, workspaceId, "sandboxes"),
      queryFn: () => fetchSandboxes(accountId, workspaceId),
    }),
};
```

## Server prefetch + HydrationBoundary

Every page that owns the cache for its data prefetches in the server component and wraps the client subtree in `<HydrationBoundary state={dehydrate(queryClient)}>`. Client components read with `useSuspenseQuery(<queries>.<key>(...))` so the type narrows to non-nullable.

```tsx
// page.tsx (server)
export default async function SandboxesPage() {
  const { accountId, workspaceId } = await getCurrentTenancy();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(sandboxQueries.list(accountId, workspaceId));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SandboxesList />
    </HydrationBoundary>
  );
}

// sandboxes-list.tsx (client)
"use client";
export function SandboxesList() {
  const { accountId, workspaceId } = useCurrentTenancy();
  const { data } = useSuspenseQuery(sandboxQueries.list(accountId, workspaceId));
  // ...
}
```

The shell/layout level (`(app)/layout.tsx`, `(manage)/layout.tsx`) prefetches data the shell itself reads (active org, viewer profile) so the avatar menu paints with real data on first byte.

## Tenancy resolvers

- **Server** — `getCurrentTenancy()` (from `lib/query/tenancy.ts`) resolves `{ accountId, workspaceId }` from the session cookie. Pre-RBAC mock pins both to the currently-active org.
- **Client** — `useCurrentTenancy()` (from `lib/query/tenancy-context.tsx`) reads the same shape from a context populated at the `(app)` / `(manage)` layout level.

Every query factory takes `accountId` (and `workspaceId` for workspace-scoped resources) as arguments. Components never reach for a global "current org" — they always go through the tenancy hook.

## Data source — no `/api` routes for mocks

QueryFns call mock helpers in `lib/mock/{domain}.ts` directly. Both server prefetch and client `useQuery` resolve through the same path. Do not introduce `app/api/*` route handlers for fixture data — the indirection earns nothing and breaks RSC dedupe.

When the real backend lands, swap the queryFn body to call the API client; the cache keys and consumer shape do not change.

## Invalidation rules

1. **Cascade by default.** Invalidate at the highest justified prefix. A user switch drops `queryKeys.all`; a workspace switch drops `queryKeys.workspace(accountId, wsId)`.
2. **Surgical when the mutation response provides identity.** Member-remove invalidates `queryKeys.members(accountId)`, not the whole account.
3. **No hardcoded keys.** Always via the factory.
4. **No cross-domain duplication.** A given resource lives at exactly one cache prefix — no parallel storage under a different root.

## File map

| Path                                       | Owner                                |
| ------------------------------------------ | ------------------------------------ |
| `lib/query/get-query-client.ts`            | Per-request server / browser singleton |
| `lib/query/keys.ts`                        | Tenancy-first key factory             |
| `lib/query/tenancy.ts` (server)            | `getCurrentTenancy`, `getCurrentWorkspaceId` |
| `lib/query/tenancy-context.tsx` (client)   | `TenancyProvider`, `useCurrentTenancy` |
| `lib/query/{domain}.ts`                    | `queryOptions` factories per domain   |
| `lib/mock/{domain}.ts`                     | Async data helpers wrapping fixtures  |
| `lib/mock/data.ts` + `lib/mock/types.ts`   | Static fixture source (do not import from page code) |
