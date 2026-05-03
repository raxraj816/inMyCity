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
- `/(tabs)/explore` — Explore tab: CategoryGrid (9 tiles) + City Guides + Trending
- `/(tabs)/feeds` — Feeds tab
- `/shops` — Shops list (category pills + Has Deals toggle + ShopCard with call button + deal badge)
- `/movies` → `/movie/[id]` — Movie listings + detail
- `/hotels` → `/hotel/[id]` — Hotel listings + detail
- `/activities` → `/activity/[id]` — Activities listings + detail
- `/transit` — Transit line browser (filter by type, search stations)
- `/transit/plan` — Journey planner (from/to search → route results)
- `/transit/line/[id]` — Transit line detail (stops, times, fare)
- `/transit/route/[id]` — Transit route detail (step-by-step, tips, transfers)

### CategoryGrid (3×3)
- Row 1 — Discovery: Dining / Activities / Events
- Row 2 — Lifestyle: Shops / Sports & Fitness / Hotels
- Row 3 — Practical: Transit / Deals / Nightlife

### Category Colors
- primary / Shops: `#f97316` (orange)
- Transit: `#06b6d4` (cyan)
- Movies: `#8b5cf6` (purple)
- Hotels: `#f59e0b` (amber)
- Activities: `#ef4444` (red)
- Sports: `#22c55e` (green)
- Nightlife: `#ec4899` (pink)

### AI Assistant Feature
- **Endpoint**: `POST /api/ai/chat` — SSE streaming, accepts `{ message, city, history[] }`
- **AI Provider**: OpenAI via Replit AI Integrations (gpt-5.4, no API key needed)
- **City context**: Deep system prompt with neighborhood/food/transit/culture knowledge for Mumbai, Bangalore, NYC, SF
- **Frontend**: `/ai-chat` modal screen (slides up from bottom) with streaming text bubbles
- **Entry point**: "Ask AI" floating action button (bottom-right) on Explore, Pulse, and City Guide tabs
- **Lib**: `@workspace/integrations-openai-ai-server` — pre-configured OpenAI SDK client
- **DB tables added**: `conversations`, `messages` (for future persistence; chat is currently stateless)

### Critical Notes
- `Link asChild` crashes web — always use `useRouter` + `router.push()`
- No `python3` in env — use `node -e` for scripting
- Drizzle-kit lives in `lib/db/node_modules/.bin/drizzle-kit`; run via `pnpm --filter @workspace/db run push`

## DB Tables
- `places`, `events`, `deals`, `itineraries`, `itinerary_stops`
- `movies`, `hotels`, `activities`
- `transit_lines`, `transit_routes` (seeded with 17 lines + 17 routes across all 4 cities)
- Shopping places: 22 places seeded across all 4 cities (`category: "shopping"`) with phone, website, openingHours, tags for sub-filtering
- Shopping deals: 6 shop-specific deals seeded (Fabindia, Bombay Store, Namma Ooru, Strand, Amoeba, Heath Ceramics)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
