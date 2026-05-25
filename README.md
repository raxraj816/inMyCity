# inMyCity

Local-first city discovery app built with Expo, React Native, Express, PostgreSQL, Drizzle, and pnpm workspaces.

## Requirements

- Node.js 24
- pnpm via Corepack
- Docker Desktop, or another local PostgreSQL instance

## Local Setup

```sh
corepack enable
corepack prepare pnpm@10.25.0 --activate
corepack pnpm install
docker compose up -d postgres
corepack pnpm run db:push
corepack pnpm run db:seed
```

## Run Locally

Start the API:

```sh
corepack pnpm run dev:api
```

Start Expo in a second terminal:

```sh
corepack pnpm run dev:app
```

Defaults:

- API: `http://localhost:3001`
- Expo: `http://localhost:8081`
- Database: `postgres://inmycity:inmycity@localhost:5432/inmycity`

Set `OPENAI_API_KEY` if you want the AI chat endpoint to work. The rest of the app can run without it.
