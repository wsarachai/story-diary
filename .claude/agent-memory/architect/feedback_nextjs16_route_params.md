---
name: Next.js 16 route handler params are a Promise
description: In story-diary's Next.js 16, dynamic route params are a Promise and must be awaited; RouteContext<'/path/[id]'> is globally available
type: feedback
---

In Next.js 16 (the version used in `frontend/`), dynamic route params on
Route Handlers are typed as `Promise<{ ... }>` and must be `await`ed before
use. There is also a globally available `RouteContext<'/path/[id]'>` helper
that provides typed `params` from a route literal — it does **not** need to
be imported.

```ts
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/users/[id]'>) {
  const { id } = await ctx.params;
}
```

**Why:** This is a breaking change vs Next.js 13/14 muscle memory (where
params were a plain object). `frontend/AGENTS.md` explicitly warns: do not
rely on training-data Next.js conventions; read `node_modules/next/dist/docs/`.
The authoritative source is
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.

**How to apply:** When sketching handler skeletons in specs for this project,
always show params being awaited and use `RouteContext<...>` rather than
hand-rolled `{ params }: { params: ... }` types.
