## Status
last-updated: 2026-05-01T17:31
resuming-at: complete

## Steps
- [x] 1. Redux store skeleton — store/index.ts + authSlice.ts (state shape only)
- [x] 2. BookShellLayout primitive — port .screen + .book-shell to Tailwind v4 @theme
- [x] 3. s001 Landing static — app/page.tsx with <Link href="/login"> CTA
- [x] 4. auth/probeSession thunk + DS-1 splash in app/layout.tsx
- [x] 5. s002 Login form — controlled local state + auth/login thunk + DS-3
- [x] 6. s003 Register form — useReducer form state + auth/register thunk + DS-4
- [x] 7. (authed)/layout.tsx — AuthedShell + IconRail + auth guard
- [x] 8. s004 Home — StoryCardPanel, DashboardPanel, FeatureCard
- [x] 9. DS-2 guards on /, /login, /register
- [x] 10. Stub routes: /chapters, /habit, /minigame placeholder pages

## Notes
- Types from src/types/ are copied to frontend/types/ (symlinks don't work with Turbopack)
- Keep frontend/types/ in sync with src/types/ when src/types/ changes
- Turbopack used for build (Next.js 16 default)
