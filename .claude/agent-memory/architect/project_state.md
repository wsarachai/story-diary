---
name: Project state at first API spec
description: Snapshot of story-diary repo when the first API endpoint (user profile) was specced — backend was empty, no API routes existed yet
type: project
---

As of 2026-04-29 the story-diary repo had **no backend code and no API routes**.
The user profile spec (`docs/specs/user-profile.md`) is the first API contract
in the project, which is why it also pins down cross-cutting decisions (error
envelope shape, `users` table schema, auth primitives) that future specs should
inherit rather than redefine.

**Why:** Greenfield decisions made in the first spec become de-facto standards.
Calling them out explicitly here so the next spec doesn't re-litigate them.

**How to apply:** Before writing a new API spec, read `docs/specs/user-profile.md`
for the established `ApiError` envelope and the `users` table contract. Only
deviate with a stated reason.
