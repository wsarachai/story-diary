---
name: User profile has two unreconciled field sets
description: docs/specs/user-profile.md uses (name, email, characterName, gender); docs/api-spec-users-id.md uses (displayName, avatarUrl, languagePreference) — same endpoint, different scopes
type: project
---

There are now **two specs** for `GET / PATCH /api/users/:id`:

1. `docs/specs/user-profile.md` — fields: `name`, `email`, `characterName`,
   `gender`. Derived from `docz/layouts/s003-register.html`. The existing
   route handler at `frontend/app/api/users/[id]/route.ts` and the types in
   `frontend/lib/types/user.ts` implement this.
2. `docs/api-spec-users-id.md` — fields: `displayName`, `avatarUrl`,
   `languagePreference`. Requested by team-lead 2026-04-29. Adds a profile
   layer beyond the registration identity.

**Why:** The team-lead's task explicitly listed a different field set than
the prototype source-of-truth. Rather than overriding the team-lead, the
new spec was written as requested with an "Open Questions" section flagging
the discrepancy as the first follow-up item.

**How to apply:** Before implementing either spec, the discrepancy must be
resolved. Ask: should `displayName` replace `name`, coexist with it, or be
computed from `name + characterName`? The user's answer determines whether
`frontend/lib/types/user.ts` is extended or rewritten. Until then, treat
both specs as drafts whose union has not been validated against
`docz/layouts/`.
