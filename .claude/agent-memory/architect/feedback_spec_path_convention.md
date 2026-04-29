---
name: Spec file location is whatever the requester asks for
description: Some specs go in docs/specs/, others at docs/<name>.md — follow the path the requester names; do not "correct" it to a sibling location
type: feedback
---

Specs in this repo do not all live under `docs/specs/`. The first spec is at
`docs/specs/user-profile.md`, but team-lead requested the second spec at
`docs/api-spec-users-id.md` (top-level `docs/`, not nested).

**Why:** When a teammate names an exact output path, it usually reflects
either (a) where the next person in the pipeline will look, or (b) a naming
convention shift in progress. Quietly relocating the file to the "tidier"
sibling directory creates a broken handoff. The architect's job here is
content, not directory structure.

**How to apply:** When asked to write to a specific path, write to that
path verbatim. If you think the location is inconsistent with project
norms, mention it once in the response — do not silently move the file.
