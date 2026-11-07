## UI components

This project uses **shadcn/ui** (`src/components/ui/`).

### Dropdowns — shadcn only (never plain HTML)

Every dropdown, select, or menu **must** use the shared shadcn components. **Never** render a plain HTML `<select>` / `<option>` / `<datalist>`, or hand-roll a dropdown from `<div>`/`<ul>` + state.

| Need                                   | Use                                                              |
| -------------------------------------- | ---------------------------------------------------------------- |
| Pick one value (form, filter)          | `@/components/ui/select` (or the `select-dropdown.tsx` wrapper)  |
| Action menu (row actions, kebab, user) | `@/components/ui/dropdown-menu`                                  |
| Searchable / command palette           | `@/components/ui/command`                                        |

Reuse an existing shared component from `src/components/ui/` before creating a new one. If a needed component is missing, add it with the shadcn CLI (`npx shadcn@latest add <component>`) rather than writing a plain HTML alternative.

## UI modes — every feature must work in both Classic and Playful

The app has two UI modes (`useIsPlayful()` from `@/hooks/use-ui-mode`; classic is the default). A feature is not done until it is reachable and usable in **both**. Never ship a feature that only appears in one mode.

- **Project sections (tabs):** navigation is grouped (Overview / Learn / Practice / Track / Manage) and defined once in `src/pages/projects/project-sections.ts`, which feeds both `layout.tsx` (classic) and `components/playful-project-header.tsx` (playful). Add a new project page to the right group there (icon + color), plus its `sections.<key>` label in every `i18n/locales/*/projects.json`. Don't re-add per-mode tab lists.
- **Routes:** add to `src/routes/routes.ts` (`Routes` + `RoutePatterns`) and `src/routes/index.tsx` once; both modes share them.
- **Dashboard / entry points:** if a feature is surfaced on the dashboard or home, add it to the classic components (`pages/dashboard/components/`) and the playful ones (`pages/dashboard/components/playful/`).
- **Shared dialogs/forms:** reuse the same component in both modes; only fork the layout/shell when the design genuinely differs.
- **Verify** by toggling the mode in Settings → UI mode and checking the feature in both before finishing.
