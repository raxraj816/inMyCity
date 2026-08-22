# inMyCity

inMyCity is a local-first city discovery and planning app. It helps people decide what to do, where to go, and what to know in their city through curated places, events, deals, transit, local updates, city guides, saved plans, and an AI city assistant called CityPilot.

The product vision is captured in [docs/vision.md](/Users/rajkumar/Documents/workspace/inMyCity/docs/vision.md).

## What This App Is

inMyCity is designed as a personal city operating system:

- **Explore**: browse dining, activities, events, shops, sports, hotels, transit, deals, nightlife, movies, and itineraries.
- **Pulse**: see local updates, trusted news-style alerts, creator/community signal, and Q&A.
- **City Guide**: understand a city through neighborhoods, highlights, transit, visitor tips, and curated activities.
- **CityPilot**: ask an AI assistant for city-specific help, recommendations, and planning.

The app currently supports city-specific content for Mumbai, Bangalore, New York City, and San Francisco.

## Tech Stack

- **Package manager**: pnpm via Corepack
- **Runtime**: Node.js 24
- **Monorepo**: pnpm workspaces
- **Mobile/web app**: Expo, React Native, Expo Router, TypeScript
- **API server**: Express 5, TypeScript, esbuild
- **Database**: PostgreSQL with Drizzle ORM
- **Data fetching**: generated React Query API client
- **Validation/codegen**: OpenAPI, Orval, Zod
- **AI integration**: OpenAI-compatible API via `OPENAI_API_KEY`

## Repository Layout

```text
.
├── artifacts/
│   ├── inmycity/          # Expo + React Native app
│   ├── api-server/        # Express API server and seed script
│   └── mockup-sandbox/    # Vite mockup/sandbox app
├── lib/
│   ├── api-spec/          # OpenAPI spec and codegen config
│   ├── api-client-react/  # generated React Query API client
│   ├── api-zod/           # generated Zod schemas/types
│   ├── db/                # Drizzle schema and database client
│   ├── integrations-openai-ai-react/
│   └── integrations-openai-ai-server/
├── scripts/               # workspace scripts/utilities
├── docs/
│   └── vision.md          # product vision document
├── docker-compose.yml     # local PostgreSQL
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

Install these before running the project:

- Node.js `24.x`
- Docker Desktop, or another local PostgreSQL instance
- Corepack, bundled with modern Node.js

Check your local versions:

```sh
node --version
docker --version
corepack --version
```

## Quick Start

From the repository root:

```sh
corepack prepare pnpm@10.25.0 --activate
corepack pnpm install
docker compose up -d postgres
corepack pnpm run db:push
corepack pnpm run db:seed
```

Start the API server:

```sh
corepack pnpm run dev:api
```

In a second terminal, start the Expo app:

```sh
corepack pnpm run dev:app
```

Open the app at:

- Expo web app: `http://localhost:8081`
- API server: `http://localhost:3001`
- API health check: `http://localhost:3001/api/healthz`

## Environment Variables

Copy the example file if you want a local `.env` reference:

```sh
cp .env.example .env
```

The default local development values are:

```sh
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://inmycity:inmycity@localhost:5432/inmycity
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Optional AI settings:

```sh
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
# OPENAI_BASE_URL=
```

Optional auth settings:

```sh
# Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Generic OIDC login at /api/login
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
```

The app can run without `OPENAI_API_KEY`; only the CityPilot chat endpoint will return an unavailable response until the key is configured.

## Workspace Commands

Run these from the repository root.

| Command | Description |
| --- | --- |
| `corepack pnpm install` | Install workspace dependencies |
| `corepack pnpm run dev:api` | Build and start the API server on port `3001` |
| `corepack pnpm run dev:app` | Start Expo on port `8081` |
| `corepack pnpm run db:push` | Push Drizzle schema to PostgreSQL, then apply the search extension and indexes |
| `corepack pnpm run db:seed` | Seed local city data |
| `corepack pnpm run typecheck` | Typecheck shared libs, API server, app, and scripts |
| `corepack pnpm run test` | Run the test suite across the API server and the app |
| `corepack pnpm run build` | Typecheck and build packages with build scripts |

Package-specific examples:

```sh
corepack pnpm --filter @workspace/inmycity run typecheck
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/api-server run seed
corepack pnpm --filter @workspace/db run push
corepack pnpm --filter @workspace/db run bootstrap
corepack pnpm --filter @workspace/scripts run bench:places
```

`bootstrap` applies the database objects Drizzle's schema DSL cannot express — the `pg_trgm`
extension, the trigram indexes search matches against, and the `lower(city)` expression
indexes the list endpoints filter on. It is idempotent and already runs as part of `db:push`.

`bench:places` load-checks the list endpoints against 2,000 seeded rows. It inserts synthetic
rows tagged as generated, measures, and deletes them again, so curated seed data is untouched.
The API server must be running.

## Database

Local PostgreSQL is defined in [docker-compose.yml](/Users/rajkumar/Documents/workspace/inMyCity/docker-compose.yml).

Default credentials:

```text
database: inmycity
user:     inmycity
password: inmycity
host:     localhost
port:     5432
```

Start the database:

```sh
docker compose up -d postgres
```

Stop the database:

```sh
docker compose stop postgres
```

Reset local data:

```sh
docker compose down -v
docker compose up -d postgres
corepack pnpm run db:push
corepack pnpm run db:seed
```

The seed script inserts sample content for places, events, deals, movies, hotels, activities, transit, and related city discovery experiences.

It also writes each row's `search_text`: the flattened, normalized blob that `/api/search`
matches against, always starting with the row's own name. Adding a searchable column to a table
means adding it to `SEARCH_TEXT_FIELDS` in the seed script and re-seeding — nothing else reads
or writes that column.

## API Server

The API server lives in `artifacts/api-server`.

Important routes include:

- `GET /api/healthz`
- `GET /api/cities`
- `GET /api/explore`
- `GET /api/places`
- `GET /api/events`
- `GET /api/deals`
- `GET /api/movies`
- `GET /api/hotels`
- `GET /api/activities`
- `GET /api/transit/lines`
- `GET /api/transit/routes`
- `POST /api/ai/chat`

The API uses the shared database package in `lib/db` and generated schemas/types from `lib/api-zod`.

## Expo App

The app lives in `artifacts/inmycity`.

Important app areas:

- `app/(tabs)/index.tsx`: main Explore page
- `app/(tabs)/feeds.tsx`: Pulse feed
- `app/(tabs)/cityguide.tsx`: City Guide
- `app/(tabs)/search.tsx`: search experience
- `app/ai-chat.tsx`: CityPilot chat
- `app/dining.tsx`, `app/events.tsx`, `app/deals.tsx`, `app/movies.tsx`, `app/hotels.tsx`, `app/activities.tsx`, `app/transit.tsx`: category screens
- `components/`: reusable cards, headers, filters, city picker, and UI building blocks
- `context/`: city and location state
- `hooks/`: shared app hooks

The app calls the API using `EXPO_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:3001`.

## API Client And Codegen

The OpenAPI source is in `lib/api-spec/openapi.yaml`.

Generated clients live in:

- `lib/api-client-react`
- `lib/api-zod`

When API contracts change, regenerate clients with:

```sh
corepack pnpm --filter @workspace/api-spec run codegen
```

Then run:

```sh
corepack pnpm run typecheck
```

## Development Workflow

Recommended local workflow:

1. Start Docker Desktop.
2. Start Postgres with `docker compose up -d postgres`.
3. Start the API with `corepack pnpm run dev:api`.
4. Start Expo with `corepack pnpm run dev:app`.
5. Open `http://localhost:8081`.
6. Run `corepack pnpm run typecheck` before handing off changes.

For schema changes:

1. Update Drizzle schema files in `lib/db/src/schema`.
2. Run `corepack pnpm run db:push`.
3. Update seed data if needed in `artifacts/api-server/src/seed.ts`.
4. Run `corepack pnpm run db:seed`.
5. Verify the app and API behavior locally.

For API contract changes:

1. Update routes and response shapes.
2. Update `lib/api-spec/openapi.yaml`.
3. Run API codegen.
4. Run typecheck.
5. Verify app screens that consume the changed API.

## Troubleshooting

### `pnpm: command not found`

Use Corepack explicitly:

```sh
corepack pnpm --version
corepack pnpm install
```

If needed, prepare the pinned pnpm version:

```sh
corepack prepare pnpm@10.25.0 --activate
```

### Docker cannot connect to the daemon

Start Docker Desktop first, then retry:

```sh
docker info
docker compose up -d postgres
```

### API cannot connect to PostgreSQL

Confirm the container is running:

```sh
docker compose ps
```

Then check the configured database URL:

```sh
echo "$DATABASE_URL"
```

For default local development, use:

```sh
postgres://inmycity:inmycity@localhost:5432/inmycity
```

### Expo app cannot reach the API

Make sure the API server is running:

```sh
curl http://localhost:3001/api/healthz
```

If running Expo with a custom API host, set:

```sh
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 corepack pnpm run dev:app
```

### CityPilot returns unavailable

Set `OPENAI_API_KEY` in your environment before starting the API:

```sh
OPENAI_API_KEY=your_key_here corepack pnpm run dev:api
```

## Useful Links

- Product vision: [docs/vision.md](/Users/rajkumar/Documents/workspace/inMyCity/docs/vision.md)
- App package: [artifacts/inmycity](/Users/rajkumar/Documents/workspace/inMyCity/artifacts/inmycity)
- API package: [artifacts/api-server](/Users/rajkumar/Documents/workspace/inMyCity/artifacts/api-server)
- Database package: [lib/db](/Users/rajkumar/Documents/workspace/inMyCity/lib/db)
- OpenAPI spec: [lib/api-spec/openapi.yaml](/Users/rajkumar/Documents/workspace/inMyCity/lib/api-spec/openapi.yaml)

