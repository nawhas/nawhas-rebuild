# Components

The project has two sources of components:

1. **`@nawhas/ui`** (`packages/ui/`) — shared utilities and primitives exported for use across all packages
2. **`apps/web/src/components/`** — application-level components that live in the web app

## `@nawhas/ui`

The shared UI package currently exports one utility used throughout the app:

### `cn(...inputs)`

A className merger built on `clsx` and `tailwind-merge`. Use it wherever you need to conditionally combine Tailwind classes.

```typescript
import { cn } from '@nawhas/ui';

// Merge classes safely — no duplicate or conflicting utilities
const className = cn(
  'px-4 py-2 rounded',
  isActive && 'bg-primary text-white',
  className  // allow callers to override
);
```

`cn` resolves Tailwind conflicts correctly: `cn('px-4', 'px-8')` → `'px-8'`, not `'px-4 px-8'`.

### When to add to `@nawhas/ui`

Add a component to `packages/ui/` when it:
- Has **no domain knowledge** (no reciters, albums, tracks, lyrics)
- Will be used in **more than one app** in the monorepo (currently only `apps/web`, but `apps/admin` is planned)
- Is a **pure UI primitive** (button, badge, card, dialog, input) with no data fetching

Application-specific components (player bar, album grid, search results) belong in `apps/web/src/components/`.

### Adding a component to `@nawhas/ui`

1. Create the component file in `packages/ui/src/components/`
2. Export it from `packages/ui/src/index.ts`
3. Import in `apps/web` via `import { MyComponent } from '@nawhas/ui'`

Since `apps/web/next.config.ts` transpiles `@nawhas/ui`, TypeScript types are resolved directly from source — no build step required during development.

## Application Components (`apps/web/src/components/`)

Application components are split by domain and layout concern:

```
apps/web/src/components/
├── providers/
│   └── audio-provider.tsx    # Mounts the AudioEngine singleton
├── layout/
│   ├── page-layout.tsx       # Root layout: header / main / footer
│   ├── header.tsx
│   ├── nav.tsx
│   ├── nav-links.tsx
│   ├── footer.tsx
│   └── mobile-nav.tsx
├── player/
│   ├── player-bar.tsx        # Persistent bottom player bar
│   └── queue-panel.tsx       # Slide-out queue drawer
├── reciters/
│   └── reciter-grid.tsx      # Grid of reciter cards
└── auth/
    └── user-menu.tsx         # Sign in / sign out menu
```

### Conventions

**Semantic HTML first.** Use the correct element (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`) before reaching for a `<div>`. This reduces the ARIA attribute burden and makes accessibility testing easier.

**ARIA regions.** Major interactive areas use `role="region"` with an `aria-label` so screen readers and Playwright tests can locate them:

```tsx
<section role="region" aria-label="Audio player">
  {/* player bar content */}
</section>
```

**Tailwind for all styling.** No CSS modules, no inline styles. Use `cn()` from `@nawhas/ui` for conditional classes.

**Client vs Server components.** Components that use React state, browser APIs, or event handlers must include `'use client'` at the top. Server Components are the default and preferred for data-display components.

```tsx
'use client';   // required for useState, onClick, Zustand store access
```

**Radix UI for headless primitives.** Use `@radix-ui/react-*` packages for complex interactive components (dialogs, dropdowns, tooltips) that require accessibility handling. Wrap them in a local component to apply Nawhas styles.

### Testing components

Write a Vitest test for any component with meaningful structure or interactive behaviour. See [docs/testing.md](testing.md) for patterns.

## Radix UI

Radix UI provides unstyled, accessible primitives. The project uses `@radix-ui/react-slot` for the polymorphic `asChild` pattern.

When you need a new Radix primitive:

```bash
pnpm --filter @nawhas/web add @radix-ui/react-dialog
```

Wrap the Radix component in a local file under `apps/web/src/components/` and apply Tailwind classes there. Do not import Radix primitives directly in feature components — always go through the local wrapper.

## Storybook

Storybook is not yet set up. When component library documentation grows, it will be added to `packages/ui`. This is tracked as future work.
