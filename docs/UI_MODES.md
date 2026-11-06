# UI modes: Playful vs Classic

QuizMe ships two UIs on top of the same shadcn components, data layer and routes.

| | Playful | Classic (default) |
| --- | --- | --- |
| Target | Mobile-first, Duolingo/Babbel-style | Desktop-first, original UI |
| Shell | Bottom tab bar (phones/tablets), icon rail (lg), labelled rail + stats column (xl) | Floating shadcn sidebar + header |
| Home | Learning path per course (`pages/dashboard/components/playful`) | Analytics dashboard |
| Lessons | Full-screen lesson player with Check/Continue sheet (`quiz-take/components/lesson-view.tsx`) | Card-based practice player |
| Look | `playful` design system (Nunito, green, 3D "ridge" buttons) + `src/themes/playful.css` | User's chosen design system/palette |

## Where the mode lives
- DB: `user_preferences.ui_mode` (`"classic" | "playful"`, default `"classic"` for new accounts), migrations `20261106300000_user_ui_mode` and `20261106400000_ui_mode_default_classic` (existing rows keep their value).
- API: `PATCH /users/me/preferences { ui_mode }` (validated in `UpdatePreferencesDto`).
- App: `usePreferencesStore().ui_mode` → `useUiMode()` / `useIsPlayful()` / `useSetUiMode()` (`src/hooks/use-ui-mode.ts`).
  `PreferencesProvider` applies it via `setThemeUiMode()` which sets `<html data-ui>` and forces the playful design system.
  `index.html` sets `data-ui` before first paint from the persisted store.
- Switch: Profile page (`/profile`), Settings → Profile and Settings → Preferences (`UiModePicker`).

## Styling hooks
shadcn primitives expose `data-slot` (+ `data-variant` / `data-size` on buttons and badges). `playful.css` restyles them only under
`html[data-ui="playful"]`, so classic stays untouched. Helpers: `.pf-btn-{blue,orange,red,white}`, `.pf-node`, `.pf-choice`,
`.classic-only` / `.playful-only`.

## Learning path
Units = top-level topics; lessons = leaf topics (split into up to 3 mastery levels when a unit is small). A level is done at
`80% × level / levels` mastery. Lesson nodes start a 5-question PRACTICE quiz for that topic (`use_bank: true`), chests open
flashcard review, the trophy starts a 10-question unit review. The current course is stored in `stores/learn.ts`.

## Artwork
Mascot "Qubi" + icons in `app/public/mascot/*.webp`, generated with OpenAI `gpt-image-1.5` (transparent PNG → 512px WebP).
Render with `<Mascot pose="…" />` / `<Illo name="…" />` (`src/components/ui/mascot.tsx`).
