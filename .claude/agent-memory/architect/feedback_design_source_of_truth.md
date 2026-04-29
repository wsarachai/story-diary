---
name: Design source of truth is docz/layouts
description: When designing features for story-diary, derive field names, enums, and required-vs-optional from the HTML prototypes in docz/layouts before inventing schemas
type: feedback
---

The HTML prototypes in `docz/layouts/` (s001–s019) are the **design source of
truth** for story-diary, per `CLAUDE.md`. Form `name=` and `value=` attributes
in those files dictate the API field names and enum values.

**Why:** Inventing field names independently of the prototypes creates churn
when the frontend implementer then has to either rename API fields or maintain
a translation layer. The prototypes already encode product decisions
(e.g. gender is a two-option radio: `male` / `female`).

**How to apply:** Before writing a request/response schema, grep the relevant
`s0XX-*.html` files for `name=`, `value=`, `placeholder=`, and `<label>` to
extract the canonical field set. Only add fields beyond that with an explicit
note in the spec's "Open Questions / Future Work" section.
