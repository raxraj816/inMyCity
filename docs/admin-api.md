# Admin and moderation API

The protected content surface built in Phase 2.3 of the [launch readiness plan](mumbai-launch-readiness.md).
It exists so that fixing a wrong phone number, publishing a news item, or taking a reported post
down is an action someone performs — not a deploy.

It is **not** in [`lib/api-spec/openapi.yaml`](../lib/api-spec/openapi.yaml), and that is deliberate.
The spec drives orval codegen for the Expo app; the admin surface has no app client, so generating
a React Query hook and a Zod schema per endpoint would be dead code. The generic
`/admin/{collection}` route also carries a path parameter and query filters at once, which orval
renders as a value and a type under the same name. This document is the contract instead.

## Access

Every route below is behind `requireAdmin`:

| Situation | Response |
| --- | --- |
| `ADMIN_EMAILS` unset | `503` — a missing configuration never means "everyone" |
| Not signed in | `401` |
| Signed in, not on the allowlist | `403` |

`ADMIN_EMAILS` is a comma-separated list, compared case-insensitively. It is an environment
variable rather than a database column on purpose: an attacker who reaches the database should not
be able to grant themselves the ability to edit every content row.

Authenticate the same way the app does — a session cookie, or `Authorization: Bearer <sid>`.

## Content CRUD

```
GET    /api/admin/collections            # what can be edited, and which fields
GET    /api/admin/:collection            # ?city= &status= &q= &limit= &offset=
GET    /api/admin/:collection/:id
POST   /api/admin/:collection
PATCH  /api/admin/:collection/:id
DELETE /api/admin/:collection/:id        # body: { reason }
POST   /api/admin/:collection/:id/verify # stamps lastVerifiedAt
```

Collections: `places`, `events`, `deals`, `movies`, `hotels`, `activities`, `pulse_posts`,
`news_items`, `news_sources`, `city_guides`, `city_facts`, `insider_tips`,
`sponsored_placements`.

Four properties are worth knowing because they are enforced rather than conventional:

- **A column not listed in the registry cannot be written.** `id`, `created_at`, `search_text` and
  the moderation status are structurally out of reach of a request, not defended by a check
  somebody has to remember. See [`lib/adminCollections.ts`](../artifacts/api-server/src/lib/adminCollections.ts).
- **Derived columns are recomputed on every edit.** Changing a name rewrites `search_text`;
  changing `openingHours` re-derives `opening_hours_json`. Without this a corrected name would
  leave a row findable only under the name it used to have.
- **New rows on a moderated table start `pending`.** Creating something never publishes it.
- **A row is not deleted while something points at it.** A place that is in a saved list, a
  collection, an itinerary or a deal answers `409` and names which. Moderated tables are
  soft-removed instead of deleted; the row survives with a reason so a takedown can be accounted
  for later.

Every create, edit, verification and removal appends to `moderation_actions` with the admin's
email.

## Moderation

```
GET  /api/admin/moderation/queue                    # ?city= &limit=
POST /api/admin/moderation/:type/:id/publish
POST /api/admin/moderation/:type/:id/unpublish
POST /api/admin/moderation/:type/:id/remove         # body: { reason } — required
GET  /api/admin/reports                             # ?status=open|actioned|dismissed|all
POST /api/admin/reports/:id/resolve                 # body: { outcome, note } — both required
```

`:type` is one of `pulse_post` or `news_item`.

Reports are ordered by `dueAt` — closest to breaching first, not oldest first. The window is
stamped when the report is filed, from the reason: 24 hours for the sexual-content, impersonation,
privacy and harassment categories, and 72 for a general grievance. `overdue` on each row says
whether that window has already passed.

A takedown requires a reason and a report closure requires a note. Both are recorded, including a
dismissal — deciding to leave something up has to be accountable too.

## Content health

```
GET /api/admin/content-health   # ?city= (defaults to Mumbai)
```

Volume per category against the launch targets from section 2.3 of the plan, how much of it has
been verified in the last 90 days, and the places most overdue for re-verification. `pnpm run
content:maintain` prints the same numbers and deletes deals that expired more than
`DEAL_EXPIRY_GRACE_DAYS` ago.

## News ingestion

```
pnpm run news:ingest [city]
```

Fetches every **active** source for a city and files what it finds as `pending`. Nothing reaches a
reader until an editor publishes it.

Items that are not about the city are dropped before they are written, matched on the place
names in `MUMBAI_PLACE_NAMES`. This matters more than it sounds: Indian publishers mostly run one
general feed, so a fetch of 58 items yields around 5 city stories and 35 pieces of national copy.
Filed unfiltered, that is a review queue nobody opens. The dropped count is reported as
`offTopic` and nothing is created, so there is nothing to review or take down.

Sources are rows in `news_sources`, seeded from
[`lib/news/allowlist.ts`](../artifacts/api-server/src/lib/news/allowlist.ts). A source is only
seeded with a feed URL, and only seeded active, once it has a `verifiedFeedUrl` — meaning
somebody fetched the endpoint and looked at what came back. One source is enabled today; the
other nine are off. Enabling one is a two-step editorial job:

1. Verify the publisher's feed endpoint actually returns the right city's items. Candidates worth
   checking first are listed in `CANDIDATE_FEED_URLS`; they are candidates, not facts.
2. Set it — through `PATCH /api/admin/news_sources/:id` or the `NEWS_FEED_<SLUG>_URL` environment
   override — and flip `isActive`.

A feed URL is refused unless it is `https` and its host is on that source's declared
`allowedHosts`, so editing a source row cannot point the server at an internal address.

Re-running is safe. Items match on `external_id` and an existing row is only refreshed while it is
still `pending`: once an editor has published or removed something, a later fetch cannot silently
rewrite their decision.

## Seeding

`pnpm run db:seed` is an idempotent upsert keyed on `external_id`. It refuses to run under
`NODE_ENV=production` without `ALLOW_PRODUCTION_SEED=true`.

`--reset` restores the old destructive behaviour for a local rebuild. It needs
`ALLOW_DESTRUCTIVE_SEED=true` and is refused under `NODE_ENV=production` outright.

The first non-destructive run against a database seeded the old way backfills external ids onto
existing rows first, so it corrects them instead of inserting a second copy of the catalogue.
