# AGENTS.md

Instructions for AI coding agents working in this repository. Humans should read
[README.md](README.md) for setup and [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model.

## Branching rules — do not violate

`master` and `develop` are protected. **Never commit to or push to them directly.**

- `master` — released/stable, updated only by a PR from `develop`.
- `develop` — integration branch and the **default target for every feature branch**.
- `feature/<name>` — where all work happens, branched from `develop`.

Every change you make goes on a feature branch:

```sh
git checkout develop && git pull
git checkout -b feature/<name>
# ... work, commit ...
git push -u origin feature/<name>
gh pr create --base develop
```

Before your first commit in a fresh clone, install the guard hooks once:

```sh
sh scripts/install-hooks.sh
```

They refuse commits and pushes on `master`/`develop`. **Never bypass them with
`--no-verify`, `git push --force`, or by editing `.git/hooks`** — if a hook blocks
you, you are on the wrong branch. Stop and tell the user rather than working around it.

Do not commit, push, open a PR, or merge unless the user asked for it.

## Commands

Everything runs from the repo root, and pnpm is invoked through Corepack:

```sh
corepack pnpm install         # install workspace deps
corepack pnpm run dev:api     # API server on :3001
corepack pnpm run dev:app     # Expo app on :8081
corepack pnpm run db:push     # push Drizzle schema
corepack pnpm run db:seed     # seed local city data
corepack pnpm run typecheck   # libs + api-server + app + scripts
corepack pnpm run build       # typecheck, then build every package
```

`corepack pnpm run typecheck` is the check to run before handing work back — there is
no test suite or linter configured. A `preinstall` guard rejects npm and yarn.

Scope work to one package with `--filter`:

```sh
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/inmycity run typecheck
```

Postgres must be running for anything that touches the database:

```sh
docker compose up -d postgres
```

## Layout

```text
artifacts/inmycity/         Expo + React Native app (Expo Router)
artifacts/api-server/       Express 5 API + seed script
artifacts/mockup-sandbox/   Vite mockup sandbox
lib/api-spec/               OpenAPI spec + orval codegen config  <- source of truth
lib/api-client-react/       GENERATED React Query client
lib/api-zod/                GENERATED Zod schemas/types
lib/db/                     Drizzle schema + db client
lib/city-config/            per-city configuration
lib/integrations-openai-ai-{react,server}/   CityPilot AI integration
scripts/                    workspace scripts and git hook installer
```

Packages are referenced as `@workspace/<name>`.

## Rules that are easy to get wrong

**Never hand-edit generated code.** `lib/api-client-react/src/generated/` and all of
`lib/api-zod` are produced by orval from `lib/api-spec/openapi.yaml`. Change the spec,
then regenerate:

```sh
corepack pnpm --filter @workspace/api-spec run codegen
corepack pnpm run typecheck
```

`lib/api-client-react/src/custom-fetch.ts` and `index.ts` are hand-written and safe to edit.

**API contract changes are a four-step change**, and skipping a step leaves the repo
inconsistent: update the route in `artifacts/api-server`, update `lib/api-spec/openapi.yaml`,
run codegen, then fix the app screens that consume it.

**Schema changes** go in `lib/db/src/schema`, then `db:push`, then update
`artifacts/api-server/src/seed.ts` if the new columns need data, then `db:seed`.

**Secrets stay out of the repo.** `.env.local` is local-only; document new variables in
`.env.example` and the README instead of committing values. The app runs without
`OPENAI_API_KEY` — only `POST /api/ai/chat` degrades to an unavailable response.

**City content is data, not code.** The app supports Mumbai, Bangalore, New York City,
and San Francisco; add a city through `lib/city-config` and seed data, not by branching
on city names in screens.

## Conventions

- TypeScript throughout; Prettier defaults for formatting.
- Match the surrounding file's style rather than introducing new patterns.
- The Expo app reaches the API through `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:3001`) —
  never hard-code hosts or ports in app code.
- Do not add dependencies without asking; the workspace pins versions through the
  `catalog:` block in `pnpm-workspace.yaml`.
