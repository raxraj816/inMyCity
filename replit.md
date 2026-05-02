# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed all tables (clears and re-inserts everything)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## App: inMyCity (Expo + React Native)

Smart city explorer app. City-by-city rollout: Mumbai, Bangalore, New York City, San Francisco.

### Screens / Routes
- `/(tabs)/explore` — Explore tab: CategoryGrid (8 tiles) + City Guides + Trending
- `/(tabs)/feeds` — Feeds tab
- `/movies` → `/movie/[id]` — Movie listings + detail
- `/hotels` → `/hotel/[id]` — Hotel listings + detail
- `/activities` → `/activity/[id]` — Activities listings + detail
- `/transit` — Transit line browser (filter by type, search stations)
- `/transit/plan` — Journey planner (from/to search → route results)
- `/transit/line/[id]` — Transit line detail (stops, times, fare)
- `/transit/route/[id]` — Transit route detail (step-by-step, tips, transfers)

### Category Colors
- primary: `#f97316` (orange)
- Transit: `#06b6d4` (cyan)
- Movies: `#8b5cf6` (purple)
- Hotels: `#f59e0b` (amber)
- Activities: `#ef4444` (red)

### Critical Notes
- `Link asChild` crashes web — always use `useRouter` + `router.push()`
- No `python3` in env — use `node -e` for scripting
- Drizzle-kit lives in `lib/db/node_modules/.bin/drizzle-kit`; run via `pnpm --filter @workspace/db run push`

## DB Tables
- `places`, `events`, `deals`, `itineraries`, `itinerary_stops`
- `movies`, `hotels`, `activities`
- `transit_lines`, `transit_routes` (new — seeded with 17 lines + 17 routes across all 4 cities)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
