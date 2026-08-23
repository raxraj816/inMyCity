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
corepack pnpm run db:push     # push Drizzle schema, then apply search extension + indexes
corepack pnpm run db:seed     # seed local city data
corepack pnpm run typecheck   # libs + api-server + app + scripts
corepack pnpm run test        # api-server + app test suites
corepack pnpm run build       # typecheck, then build every package
```

`corepack pnpm run typecheck` and `corepack pnpm run test` are the checks to run before
handing work back; there is no linter configured. A `preinstall` guard rejects npm and yarn.

Tests use Node's built-in runner. Anything that needs Postgres must skip itself when the
database is unreachable, the way `routes/search.integration.test.ts` does — `pnpm test` has
to pass on a machine with no Docker running.

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

**The admin API is deliberately not in the OpenAPI spec.** `/api/admin/*` has no app client, so
generating a React Query hook and a Zod schema per endpoint would be dead code, and its generic
`/admin/{collection}` route makes orval emit a value and a type under one name. It is documented
in [docs/admin-api.md](docs/admin-api.md) instead; keep that file in step when you change a route
there. Everything the app consumes still goes through the spec.

**Moderated content has one way in.** `pulse_posts`, `news_items`, `qa_questions` and
`qa_answers` carry a `status`, and it may only move through `/api/admin/moderation/...`,
which records who changed it and why. Never expose `status` as an editable field on a moderated
collection in `lib/adminCollections.ts`, and never let a route publish a row as a side effect of
creating it — a submission that skips review is a takedown obligation nobody can meet.
(`movies.status` is the release status on an unmoderated table, and is exempt.)

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
`artifacts/api-server/src/seed.ts` if the new columns need data, then `db:seed`. Prefer
`uniqueIndex(...)` in the table's extras config over a `.unique()` column modifier: `drizzle-kit
push` prompts interactively before adding a unique *constraint* to a populated table, which stalls
any non-interactive run.

**The seed is an upsert, not a rebuild.** Rows are matched on `external_id`, derived from the
row's natural key by `seedExternalId`. Adding a row to the seed needs no identifier; renaming one
creates a new row and leaves the old one, which is deliberate — retiring content should be a
decision, not a side effect. Never reintroduce a `DELETE` at the top of `seed.ts`: run against
production it wipes the rows users' favorites and collections point at.

**Database objects Drizzle cannot express** — extensions, and indexes over an expression with
an operator class — go in `lib/db/src/bootstrap.ts`, which `db:push` runs afterwards. Every
statement there must stay idempotent. That is where the `pg_trgm` extension, the trigram
indexes search uses, and the `lower(city)` indexes the list endpoints need are created.

**Search vocabulary is city content**, not code: dish names, Hinglish spellings, station
abbreviations and neighbourhood aliases live in `lib/city-config/src/search-synonyms.ts`.
Adding a term is a data change there — never a branch in the search route. A row's searchable
text is written at seed time from `SEARCH_TEXT_FIELDS`, and always starts with the row's name,
which is how relevance separates an exact name match from a mention in a description.

**Secrets stay out of the repo.** `.env.local` is local-only; document new variables in
`.env.example` and the README instead of committing values. The app runs without
`OPENAI_API_KEY` — only `POST /api/ai/chat` degrades to an unavailable response.

**City content is data, not code.** The app supports Mumbai, Bangalore, New York City,
and San Francisco; add a city through `lib/city-config` and seed data, not by branching
on city names in screens.

That includes money: never write a currency symbol into a screen. `currencyFor` and
`formatPrice` in `lib/city-config` resolve it from the row's own `currency` column where the
table has one, and from the city otherwise. A price rendered any other way will be wrong for
some city, which is how Mumbai deals came to be priced in dollars.

## Conventions

- TypeScript throughout; Prettier defaults for formatting.
- Match the surrounding file's style rather than introducing new patterns.
- The Expo app reaches the API through `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:3001`) —
  never hard-code hosts or ports in app code.
- Adding a well-established dependency is fine — one with real adoption, active
  maintenance, and a license that suits a commercial app. Prefer it over hand-rolling
  security, parsing, or platform code. Do ask before anything niche, unmaintained,
  abandoned, or copyleft. Pin shared versions through the `catalog:` block in
  `pnpm-workspace.yaml`, and use `expo install` for anything the Expo app depends on so the
  version matches the SDK.
