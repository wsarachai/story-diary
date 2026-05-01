---
name: Common.js navigation pattern
description: How wireframe screens navigate between each other and what to do with that pattern in React
type: project
---

Every wireframe in `docz/wireframes/` includes `<script src="assets/common.js">`. The script is a single delegated `click` listener that reads `data-navigate="<filename.html>"` from the closest ancestor and assigns `window.location.href`. There is essentially no other JS in the wireframes — even `<button data-navigate="...">` "submits" are just hard navigations, no form handling.

**Why:** This is a wireframe-only contract. It exists to make the static prototypes click-through-able without any framework. It is incompatible with React/Next.js client-side routing and would cause a full-page reload + state loss if ported literally.

**How to apply:** When converting a wireframe element with `data-navigate="s00X-foo.html"` to React, replace it with `<Link href="/foo">` or `useRouter().push("/foo")` typed against `AppRoute` from `src/types/navigation.ts`. Never carry `data-navigate` into production JSX. Form submits that wireframe-fake as `data-navigate="s004-home.html"` should become real `onClick` handlers that dispatch a thunk and `router.replace` only on success.
