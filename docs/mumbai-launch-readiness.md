# Mumbai Launch Readiness — Implementation Plan

Status: draft · Created 2026-08-22 · Owner: @raxraj816

This is the burn-down plan to take inMyCity from its current state to a public launch in
Mumbai. It is written as a checklist. Each item states the defect, the fix, and how to know
it is done.

Product vision lives in [vision.md](vision.md). Branching and workspace rules live in
[../AGENTS.md](../AGENTS.md).

---

## 1. Scope decision

**Every feature currently in the app ships in v1.** Explore, Pulse, City Guide, CityPilot,
movies, hotels, deals, sports, transit. Nothing is hidden or deferred.

**Mumbai is the only launch city.** Bangalore, Delhi, Pune, Hyderabad and Chennai stay
`soon`. New York and San Francisco stay `demo` and are already excluded from the city
picker. Other cities are not a v1 concern at all.

**The bar is user experience.** A Mumbai user should find the app better than the
combination of Google Maps, Instagram, and a group chat for deciding what to do tonight.
Where this plan trades geographic reach for depth in Mumbai, depth wins. It does not trade
away features to get there — see the ease-of-use principles in section 2.

Consequence of keeping full scope: the surfaces that are currently hardcoded mockups must
be built for real. That is the bulk of the work in Phase 2, and it is the main driver of the
timeline.

---

## 2. Design principles — ease of use

The app should be **easy to use**. That is a usability standard, not an argument for fewer
features. A deep app can be effortless and a small one can be baffling; what separates them
is whether the user always knows where they are, what they can do, and what will happen
next. Everything in this plan ships — these principles govern how it feels to use.

These are binding. A change that violates one is not done.

**Obvious without explanation.** A first-time user should understand a screen without a
tutorial, tooltip or onboarding slide. Use familiar patterns over clever ones. If something
needs a coach mark to be understood, redesign it instead of annotating it.

**Nothing required before value.** No permission, no login, no city selection, no filter
tuning stands between install and a useful recommendation. Location, accounts and
preferences make the app better; they are never required to make it work. Ask for them in
context, at the moment they pay off.

**Short path to the goal.** Count the taps for the real journeys — find dinner nearby, get
directions, save a place, ask CityPilot — and cut the ones that do not earn themselves.
Sensible defaults beat required choices. Remember what the user picked last time.

**Predictable and consistent.** The same gesture, icon and word mean the same thing on
every screen. Back always goes back. A card tapped anywhere opens the same detail. No
surface invents its own interaction vocabulary.

**Findable.** With six tabs and 36 screens, the burden is on navigation to make everything
reachable and labelled the way users would name it. Search covers what navigation misses,
and the home screen leads with the decision loop rather than a directory. Depth is fine;
hidden depth is not.

**Progressive disclosure.** Show what drives the decision first — is it open, how far, how
much, how do I get there — and put description, history and metadata below. Filters lead
with a few high-value chips and keep the rest behind "More". Power is available on demand,
never imposed on arrival.

**Answer before options.** Where the app can decide for the user, it should. A ranked
recommendation beats a filterable list. The list stays for people who want to browse.

**Forgiving.** Every action is recoverable. Undo on save and delete, no destructive step
without confirmation, and errors that say what to do next rather than what went wrong.

**Never promise what the app cannot do.** No button that leads to a dead end, no category
that implies booking without booking, no empty state that looks like a bug.

**Fast is part of easy.** A slow screen is a hard screen. Skeletons over spinners, cached
content on launch, optimistic interactions, and no blocking spinner on a path the user
takes daily.

**Usable in real conditions.** One hand, on a moving train, in bright sun, on a weak
connection, possibly with a screen reader. Tap targets large enough to hit while standing;
text that survives font scaling; contrast that works outdoors.

**Plain language, local register.** Write the way a Mumbai friend talks. Rupees, not
currency codes. Station names people actually use. No product jargon in user-facing copy.

**Validate with real users.** Ease of use is measured, not asserted. Before launch, run
moderated usability sessions with Mumbai locals who have never seen the app, on the core
journeys, and fix what makes them hesitate.

---

## 3. Current state

Healthy:

- `corepack pnpm run typecheck` passes clean across libs, api-server, app, and scripts.
- 36 screens, 17 API route modules, 14 Drizzle tables. Phase 2 added three screens, eight
  route modules and fourteen tables on top of this.
- OpenAPI → orval → typed React Query client + Zod. The contract discipline is real.
- Auth works end to end: OIDC + Google, Postgres-backed sessions, mobile token exchange
  via the `inmycity://oauth` deep link.
- CityPilot streams over SSE, injects real Mumbai DB rows into the prompt, and degrades to a
  grounded local answer when OpenAI is unavailable.
- Mumbai-first config already exists and is used: `MUMBAI_LAUNCH_ZONES` (12 zones carrying
  vibe, `bestFor`, `transitAccess`, `priceBand`, `bestTime`, `monsoonNote`, `safetyContext`)
  is consumed by the home screen, City Guide, neighborhood detail, CityPilot, and the
  recommendations route.

Content inventory for Mumbai, from `artifacts/api-server/src/seed.ts` (places rose to 35 in
Phase 1, when the street-food institutions the search work depended on were added):

| Table | Mumbai rows |
| --- | --- |
| places | 35 |
| activities | 13 |
| events | 8 |
| deals | 8 |
| movies | 5 |
| hotels | 5 |
| transit lines | 5 |
| transit routes | 5 |
| itineraries | 2 |

Not present anywhere: CI, tests, `eas.json`, analytics, crash reporting, rate limiting,
privacy policy, account deletion, push notifications, maps.

Repository-level fixes made while working through Phase 0:

- **`corepack pnpm run build` was broken on Apple Silicon.** `pnpm-workspace.yaml` stripped
  the `darwin-arm64` native binaries for rollup, esbuild, lightningcss and
  `@tailwindcss/oxide` via `'-'` overrides, so `vite build` in `mockup-sandbox` died with
  `MODULE_NOT_FOUND`. Those four strips are removed; the workspace build now passes. The
  strips for platforms nothing here targets are left in place.
- **`app.json` is now `app.config.ts`**, so per-environment values (Maps keys, link domain)
  come from the environment instead of being committed.
- **A test runner exists.** `corepack pnpm run test` runs the suite across api-server and the
  app, using Node's built-in runner — no extra tooling. This is the base to build the Phase 4
  suite on. Phase 1 took it from 32 tests to 92, including thirteen that run against a real
  Postgres — nine covering search end to end, four asserting that the SQL "open now" filter and
  the JavaScript evaluator agree row for row — and skip themselves when none is reachable. Phase 2
  took it from 92 to 231, including 39 more against a real Postgres covering the moderation
  lifecycle, the admin surface and news ingestion.

---

## 4. Phase 0 — Launch blockers

Roughly two weeks. These either fail App Store review or are visibly broken to any Mumbai
user on day one. Nothing else should start until these are done.

### 0.1 Location: requested on launch, never used, missing iOS usage strings

**Status: done.**

`app.json` now declares the `expo-location` plugin, `NSLocationWhenInUseUsageDescription`,
and the Android permissions. `LocationContext` no longer prompts on mount — it reads existing
permission silently and raises the OS dialog only from `requestLocation()`, which is called
when the user taps "Near me". Denial turns the toggle back off and leaves every screen
working. `detectCityFromCoords` is wired: once coordinates arrive, a user who has never
picked a city has their default corrected to the live city they are actually in.

<details>
<summary>Original defect and work items</summary>

`LocationProvider` is mounted at the root in `artifacts/inmycity/app/_layout.tsx:112`, so
iOS fires the location permission prompt during cold start, before the user has seen
anything. `useLocation()` has zero consumers in the app. `detectCityFromCoords` in
`artifacts/inmycity/context/CityContext.tsx:28` is exported and never called.
`artifacts/inmycity/app.json` declares no `NSLocationWhenInUseUsageDescription` and does not
list `expo-location` in `plugins`.

Do:

- Add `expo-location` to the `plugins` array in `app.json` with an explicit
  `locationWhenInUsePermission` string in English, describing the actual benefit
  ("Show places near you and sort results by distance from where you are").
- Add matching `ios.infoPlist.NSLocationWhenInUseUsageDescription` and
  `android.permissions` entries.
- Stop requesting permission at mount. Move the request behind an explicit user action:
  a "Use my location" control on Explore/Search, or a priming screen in onboarding that
  explains the benefit before the OS prompt appears.
- Make the app fully usable when permission is denied. Denied means "sort by rating and
  show the whole city", never an error state or a blocked screen.
- Wire `detectCityFromCoords` into first-run city selection, or delete it.

Done when: a fresh install shows no permission prompt until the user asks for a
location-dependent feature; denying permission leaves every screen functional; an iOS
build passes App Store privacy validation.


</details>

### 0.2 "Open Now" is wrong for Mumbai's most important places

**Status: done.**

The evaluator now lives in `artifacts/api-server/src/lib/openingHours.ts`, covered by 13
tests in `openingHours.test.ts` (`corepack pnpm run test`), and is wired into
`routes/places.ts`. Measured against the real Mumbai seed at Saturday 23:00 IST, 15 of 40
verdicts change: 10 venues that were wrongly reported Closed now read Open — including
Bade Miyan, Leopold, Trishna, Bombay Canteen, Bastian, Aer Lounge and Social Bandra — and 5
that returned "unknown" now resolve correctly.

The structured `opening_hours_json` column now exists on `places` and `activities`, is
populated at seed time by running the display string through the parser, and is preferred
over prose when present (`resolveIsOpen`). All 27 Mumbai places and 12 of 13 activities have
structured hours; the thirteenth has no recorded hours and correctly reports unknown.
`isOpen` and an `openNow` filter were added to `/activities` via the spec and codegen.

`isPlaceOpen()` previously in `artifacts/api-server/src/routes/places.ts:21` had three
defects:

1. **Midnight crossing is unhandled.** `hour >= open && hour < close` can never be true when
   `close < open`. Bade Miyan (`Daily 7pm-3am`) computes `hour >= 19 && hour < 3` and shows
   **Closed permanently**. Same for Mohammed Ali Road (`9am-2am`) and Joe's-style late-night
   spots. These are exactly the places Mumbai users look up at 11pm.
2. **Server timezone.** `new Date().getHours()` uses the host's timezone. Deployed on a UTC
   host, every open/closed badge in Mumbai is off by 5 hours 30 minutes.
3. **Day matching is substring-based.** `"Tue-Sun 9am-5pm"` returns `null` on a Wednesday
   because the literal string `"wed"` is absent. Ranges are never expanded.

Do:

- Replace the free-text `openingHours` column with structured hours. Add a
  `opening_hours_json` column on `places` (and `activities`, which has the same field)
  holding per-weekday open/close minute offsets plus a closed flag, keeping the text column
  for display during migration.
- Rewrite `isPlaceOpen` against the structured data, computing "now" explicitly in
  `Asia/Kolkata`, handling intervals that cross midnight, and returning `null` only when
  hours are genuinely unknown.
- Backfill the structured hours for all Mumbai rows in `seed.ts`.
- Add unit tests covering: crossing midnight, a day the venue is closed, 24/7, unknown
  hours, and the 23:30 IST / 18:00 UTC boundary case.

Done when: at 11pm IST, Bade Miyan shows Open; at 6am IST it shows Closed; the result is
identical whether the server runs in IST or UTC.

### 0.3 No maps, no directions, no call button

**Status: done.**

`lib/mapLinks.ts` builds directions/show-on-map URLs (pure, 8 tests) and `lib/placeActions.ts`
drives them, preferring Google Maps — what Mumbai actually uses — and always ending on an
https fallback so the button cannot dead-end. The shared `VenueActions` component adds
Directions, Call and Website to place detail (which previously had none of them) and
Directions to event, hotel and activity detail. `LSApplicationQueriesSchemes` is declared so
iOS can query the Google Maps scheme.

`MapPreview` renders a compact, non-interactive map on each detail screen — deliberately not
pannable, because a live map inside a scrolling screen fights the page scroll; tapping it
opens navigation. A `MapPreview.web.tsx` sibling renders nothing, so `react-native-maps`
never enters the web bundle (verified: 0 references on web, 35 on iOS).

`CopyableAddress` makes the address tappable to copy, with inline transient confirmation —
the usual way to reach somewhere in Mumbai is reading the address to an auto driver or
pasting it into a ride-hailing app.

The map is shown only where it can actually render: always on iOS (Apple Maps needs no key),
on Android only when `GOOGLE_MAPS_API_KEY_ANDROID` is set, and never on web. Without the key
Android would draw a blank grey tile, and a broken map is worse than none.

<details>
<summary>Original defect and work items</summary>

There is no map dependency in `artifacts/inmycity/package.json` and no directions handoff
anywhere in the app. Every place carries `lat`/`lng` and none of it reaches the user.
`artifacts/inmycity/app/place/[id].tsx` does not import `Linking`, so places — the largest
content category — have no call button despite `phone` being on the schema, and no website
link. Hotels, activities, movies and events already use `Linking`; places and shops detail
were missed.

Do:

- Add a "Directions" action to every detail screen that opens the platform maps app with
  the destination coordinates (`maps://` / `geo:` with a Google Maps https fallback).
- Add "Call" and "Website" actions to `place/[id].tsx`, gated on the fields being present.
- Add a map view. Minimum viable is a static map image on detail screens; the better
  version is an interactive map surface for Explore results. Decide this explicitly — see
  Open Decisions.
- Add "Copy address" — useful for pasting into an auto/rickshaw driver's app.

Done when: from any place, event, hotel or activity, a user can reach turn-by-turn
navigation in two taps.


</details>

### 0.4 "Near me" is impossible despite full server support

**Status: done, and extended further than planned.**

`useNearby` + `NearbyFilters` add "Near me" and "Open now" chips to places, dining, nightlife,
hotels, events, deals and activities, threading `lat`/`lng`/`radius`/`openNow` into the
queries; `PlaceCard` already rendered `distanceKm`, so distances now appear.

The plan assumed only the wiring was missing. In fact `/events`, `/hotels` and `/activities`
ignored coordinates entirely even though the spec advertised them, so proximity was
implemented server-side for all three, the duplicated `haversineKm` in the places and deals
routes was replaced by a shared `lib/geo.ts` (7 tests), and `lat`/`lng`/`radius` plus
`distanceKm` were added to the spec and regenerated. All five list endpoints now behave
identically. The "Open now" chip is hidden where the endpoint cannot honour it, rather than
shown as a control that does nothing.

<details>
<summary>Original defect and work items</summary>

`GET /api/places` already accepts `lat`, `lng`, `radius`, `openNow`, `limit` and `offset`,
computes `distanceKm`, filters by radius and sorts by distance
(`artifacts/api-server/src/routes/places.ts:52`). The generated client already exposes all
of these in `GetPlacesParams`. **The app passes none of them.** Every list is sorted by
rating, so a user standing in Andheri is shown Colaba.

Do:

- Thread the user's coordinates from `LocationContext` into `useGetPlaces`,
  `useGetEvents`, `useGetDeals`, `useGetActivities` and `useGetHotels` wherever a list is
  rendered.
- Surface `distanceKm` on every card ("1.2 km away").
- Add a "Near me" sort toggle and an "Open now" filter chip to Explore and Search. No
  codegen is required — the params already exist.

Done when: with location granted, Explore is distance-sorted and every card shows a
distance; the "Open now" chip filters correctly.


</details>

### 0.5 Share produces no link

**Status: plumbing done, blocked on a domain.**

`lib/links.ts` builds canonical URLs and `shareEntity` includes them; place detail and every
saved-plan share (itinerary, neighborhood, saved list) now carry a link. Links are emitted
only when `EXPO_PUBLIC_WEB_BASE_URL` is set, so nothing ships pointing at a domain that does
not resolve. Inbound `inmycity://` links already work through the Expo Router scheme.

`app.json` has been replaced by `app.config.ts`, which derives `ios.associatedDomains` and
the Android `intentFilters` from `EXPO_PUBLIC_WEB_BASE_URL`. Setting that one variable now
configures deep linking on both platforms.

Outstanding, and only obtainable outside this repo: the domain itself, serving
`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`.

<details>
<summary>Original defect and work items</summary>

`artifacts/inmycity/app/place/[id].tsx:56` shares the string
`"Check out <name> on inMyCity!"` with no URL, and the app registers no deep-link handler
for incoming content links. Shared messages are dead ends and the organic growth loop is
disabled.

Do:

- Stand up canonical https URLs for shareable entities, and configure Universal Links
  (iOS `associated-domains` + AASA) and Android App Links.
- Include the URL in every share payload.
- Handle inbound links in `expo-router` so a tapped link opens the right detail screen,
  and give the web fallback an app-install prompt.

Done when: a shared Marine Drive link opens Marine Drive in the app on a device that has
it, and a sensible web page on a device that does not.


</details>

### 0.6 API hardening

**Status: done.**

`origin: true` is replaced by an allowlist from `CORS_ALLOWED_ORIGINS` (4 tests) that still
admits native builds, which send no Origin, and answers a blocked origin with 403 rather than
an unhandled 500. `securityHeaders` sets the JSON-API subset of helmet and drops
`X-Powered-By`. Rate limiting is 300/min globally plus 10/min and 200/day on `/api/ai`, and
the chat endpoint caps message length at 2000 characters and history at 20 messages.
Verified live: the 11th AI call in a minute returns 429, an oversized message returns 413.

This uses `helmet` and `express-rate-limit` rather than hand-rolled equivalents. Two helmet
defaults are overridden: `X-Frame-Options` is `DENY` rather than `SAMEORIGIN`, since nothing
here is meant to be framed, and HSTS is emitted only in production so a browser cannot pin
https for localhost. The rate limiter keys on session first and falls back to
`ipKeyGenerator`, which normalises IPv6 to a /56 subnet — raw `req.ip` would let a client
rotate through its own prefix.

Counters live in the default in-process store, so each replica enforces its own budget once
the API is scaled out. Add `rate-limit-redis` at that point; the limiter definitions do not
change.

<details>
<summary>Original defect and work items</summary>

`artifacts/api-server/src/app.ts:31` sets `cors({ origin: true, credentials: true })`, which
reflects any requesting origin while allowing credentials. There is no `helmet`, no rate
limiting, and `POST /api/ai/chat` is unauthenticated and unmetered — an open, uncapped path
to your OpenAI spend.

Do:

- Replace `origin: true` with an explicit allowlist from an env var.
- Add `helmet`.
- Add rate limiting globally, with a much tighter per-IP and per-session budget on
  `/api/ai/chat`, plus a daily cap and a spend alert.
- Add request size limits on the chat endpoint (cap `message` length and `history` depth).

Done when: an unknown origin is rejected; a scripted client hitting `/api/ai/chat` in a
loop is throttled within seconds.


</details>

---

## 5. Phase 1 — City-app table stakes

**Status: done**, apart from the dark theme and an on-device screen-reader pass, both called
out under 1.3.

Parity work: things users expect from any competent city app.

### 1.1 Real search

**Status: done.**

Search is a server endpoint now: `GET /api/search` matches places, events, deals, hotels,
activities and movies in one request, and the app sends the query instead of downloading the
catalogue. Matching runs against a `search_text` column through a `pg_trgm` GIN index, and the
query is expanded first through the city's curated vocabulary in
`lib/city-config/src/search-synonyms.ts` — 100-odd groups covering dish names, Hinglish
spellings, station abbreviations, neighbourhood aliases and Devanagari, plus an approximate
Devanagari→Latin transliterator for anything the list does not name.

Measured against the seeded Mumbai catalogue: "vada pav", "vadapav", "vada paav" and
"वडा पाव" return the same three places in 20-30ms; "cst" and "सीएसटी" both find Chhatrapati
Shivaji Terminus; "elefanta" returns no results and suggests "elephanta caves". Ranking is a
0.6/0.15/0.15/0.10 blend of text relevance, rating, distance and open-now. The screen debounces
at 250ms, keeps the last eight searches on the device, and offers the server's near-miss
suggestions when nothing matched. Nine integration tests in `routes/search.integration.test.ts`
run against a real Postgres and skip when none is reachable.

Two things worth knowing: fuzzy matching is deliberately limited to the row's name — trigram
matching a whole document finds a 60%-similar fragment in almost anything, and "chaat" was
returning an electronics shop — and the Mumbai catalogue gained eight street-food institutions
(Ashok Vada Pav, Elco, Aaswad, Ram Ashraya and others), because a search for "vada pav" that
finds nothing is a broken search however good the matching is.

<details>
<summary>Original defect and work items</summary>

`artifacts/inmycity/app/(tabs)/search.tsx:70` fires six unfiltered list queries, downloads
every place, event, deal, hotel, activity and movie for the city, then filters in JS with
`.includes()`. It works at 27 places and collapses at 2,000. It is substring-only: no typo
tolerance, no synonyms, no transliteration. "vada pav", "chaat", "veg only", "PVR",
"सीएसटी" all return nothing.

Do:

- Move search server-side. Postgres full-text search with `pg_trgm` for fuzzy matching is
  sufficient at this scale; do not add a search service yet.
- Add a curated synonym and transliteration layer for Mumbai: dish names, Hinglish spellings,
  station names and their abbreviations (CST/VT/CSMT, Bandra/BND), neighborhood aliases.
- Debounce input, add recent searches, and add zero-result suggestions.
- Rank by a blend of text relevance, distance, rating and open-now.

Done when: "vadapav", "vada paav" and "vada pav" all return the same sensible results in
under 300ms.

</details>

### 1.2 Offline and poor-network behaviour

**Status: done.**

The query cache is persisted to AsyncStorage and restored before the first render, with a
24-hour maximum age and a `gcTime` that matches it so entries survive long enough to be worth
persisting. Verified by stopping the API server and reloading the app: the deals screen still
renders its content. `expo-network` drives both an offline banner and React Query's
`onlineManager`, so queries stop retrying into a dead connection and resume when it returns.
The banner absorbs the status-bar inset and hands its children a top inset of zero, so nothing
below it shifts.

List thumbnails are `cachePolicy="memory-disk"` with explicit dimensions. Empty, error and
pull-to-refresh states now come from one place, `components/ListStates.tsx`, and every list
screen uses them — refresh went from 4 screens to all of them, and an error no longer replaces
the whole screen with a developer-facing fallback that loses the header and the way back.

One case found while testing: a query that React Query has *paused* has neither data nor an
error, and the search screen was rendering that as "no results". It now says so.

<details>
<summary>Original defect and work items</summary>

The `QueryClient` in `artifacts/inmycity/app/_layout.tsx:38` sets a 2-minute `staleTime` and
2 retries, with no persistence. Every cold start on a bad connection is a blank screen.
Mumbai users are on local trains, in basements, and on congested cells.

Do:

- Add a persisted query cache (AsyncStorage or MMKV) so the last-known city content renders
  instantly on launch.
- Configure `expo-image` disk caching with explicit policies for list thumbnails.
- Add an offline banner and make retry affordances consistent.
- Give every list a real empty state, error state and pull-to-refresh. Only 4 of the
  screens currently have `RefreshControl`.

Done when: airplane mode on a warm install still shows browsable Mumbai content with a
clear "offline" indicator.

</details>

### 1.3 Accessibility

**Status: done, with one exclusion.**

Every interactive element now carries a role, a label and — where the outcome is not obvious
from the label — a hint. Cards read as one sentence in the order the eye reads them
("Ashok Vada Pav, Place, rated 4.4 out of 5, 1.2 kilometres away, Open now") rather than as
six separate stops, decorative images are hidden from assistive tech, filter chips are tabs
with a selected state, and icon-only buttons have 44pt targets. The web accessibility tree
confirms it: every control on the search screen reports a name and a role.

Contrast is now a tested property of the palette rather than a judgement call.
`constants/colors.test.ts` computes the WCAG ratio for every pair the app renders and asserts
AA. Fixing what it caught changed several tokens: white on the brand orange was 2.80:1 and is
now 5.18:1, white on the "Open" green was 2.28:1 and is now 5.02:1, and every per-screen accent
moved one or two shades deeper. The hues are unchanged.

**Excluded: the dark theme.** `useColors` supports a dark palette and none exists — the app
renders light in dark mode today. Adding one is not a token flip: screens carry hardcoded
light-only values (white card backgrounds, tinted badge fills, `rgba(0,0,0,0.5)` overlays), so
a dark palette needs a design pass over every screen, not a new key in `colors.ts`. Contrast is
verified for the theme that ships. Dark mode should be its own item.

Still outstanding for this section: a real VoiceOver and TalkBack pass on a device. The labels
are in place and verified through the web accessibility tree, but that is not the same as
driving the "plan my evening" journey with a screen reader on a phone.

<details>
<summary>Original defect and work items</summary>

Only three files in the app carry any accessibility props: `cityguide.tsx`,
`AiChatFab.tsx` and `ErrorFallback.tsx`.

Do:

- Add `accessibilityLabel` / `accessibilityRole` / `accessibilityHint` to every interactive
  element: cards, chips, tabs, the FAB, icon-only buttons.
- Verify contrast ratios in both light and dark themes.
- Support Dynamic Type / font scaling without clipping.
- Test a full "plan my evening" journey with VoiceOver and TalkBack.

Done when: the core journey is completable end to end with a screen reader.

</details>

### 1.4 Performance and data-layer scaling

**Status: done.**

Every list endpoint now filters, sorts and paginates in SQL. Distance is a haversine expression
in the query, behind a bounding-box prefilter that lets the `(lat, lng)` index discard most of
the table before any trigonometry runs; "open now" is evaluated against the structured hours
column in SQL, mirroring `isOpenAt` interval for interval — an equivalence four tests assert
row for row against the seeded catalogue — so it applies before the page boundary rather than
after it. The content tables carry indexes on `city`, `category` and
`(city, category)`, and `lib/db/src/bootstrap.ts` adds what Drizzle's DSL cannot express —
the `pg_trgm` extension, the trigram indexes, and `lower(city)` expression indexes that the
case-insensitive city filter can actually use. `corepack pnpm run db:push` applies both halves.

Measured with 2,000 Mumbai rows seeded, via `corepack pnpm --filter @workspace/scripts run
bench:places`, which inserts synthetic rows, measures, and deletes them again:

| Request | p50 | p95 |
| --- | --- | --- |
| `/api/places?city=Mumbai` | 3.6ms | 6.2ms |
| `+ category` | 2.7ms | 3.1ms |
| `+ openNow` | 3.9ms | 5.8ms |
| `+ near me (5km)` | 3.7ms | 4.4ms |
| `+ near me + openNow` | 4.8ms | 6.5ms |
| deep page (offset 1000) | 5.7ms | 7.0ms |
| `/api/search?q=vada pav` | 23.1ms | 28.6ms |

On the client, card components are memoized, lists share one rendering budget
(`LIST_PERFORMANCE_PROPS`), the search list has a `getItemLayout` so it never measures rows,
and thumbnails have explicit dimensions and disk caching.

Two ordering bugs surfaced while rewriting the queries and are fixed: hotels and activities
were ordered by ascending rating, so both lists opened on the worst option in the city.

<details>
<summary>Original defect and work items</summary>

`GET /api/places` fetches up to 500 rows then filters, sorts and paginates in memory. The
only index in the schema is `IDX_session_expire` on the sessions table.

Do:

- Add indexes on `city`, `category`, and `(city, category)` for every content table.
- Move distance filtering into the query. Consider PostGIS, or a bounding-box prefilter
  before the haversine calculation.
- Paginate properly in SQL rather than slicing in JS.
- Audit list rendering: virtualize long lists, memoize card components, and set explicit
  image dimensions to avoid layout thrash.

Done when: `/api/places` for Mumbai responds in under 150ms with 2,000 rows seeded.

</details>

---

## 6. Phase 2 — Make every shipped surface real

Roughly six to eight weeks, and the largest slice of the plan. This is the direct cost of
keeping full feature scope.

> **Status — engineering complete, content operations outstanding.** Every surface below now
> reads from the database, has an API and a spec entry, and can be edited, moderated and taken
> down without a deploy. What remains is not code: photography, venue verification, editorial
> volume, and the commercial agreements behind section 2.4. Those are tracked at the end of
> this section under "What is still open".

### 2.1 Pulse

`artifacts/inmycity/app/(tabs)/feeds.tsx` is 858 lines with `HAPPENING_NOW`,
`PULSE_POSTS`, `NEWS_DATA`, `COMMUNITY_DATA` and `QA_DATA` as in-file constants keyed by
city. There is no table, no endpoint, no submission path, no moderation. Pulse is the
retention loop — the reason someone opens the app on a Tuesday — and today it is a static
picture of one.

Do:

- Schema: `pulse_posts`, `news_items`, `communities`, `qa_questions`, `qa_answers`, plus
  reporting and moderation tables. Include source, trust label, confidence and city on
  every row, matching the types the UI already defines.
- API routes, OpenAPI spec entries, codegen, and screen rewiring.
- A news ingestion path. Start with a small allowlist of Mumbai sources (IMD alerts, BEST,
  Mumbai Metro, Western/Central Railway, a few local publishers) via RSS or scheduled
  fetch, with editorial review before publish.
- User submission for Pulse posts and Q&A, with rate limits and image upload.
- **Moderation and compliance.** User-generated content in India brings obligations under
  the IT Rules: a named grievance officer, a published takedown path, and defined response
  windows. Budget for a report flow, a moderation queue, and a documented policy.

Done when: Pulse content is created, edited and removed without a deploy, and a reported
post can be taken down within the required window.

**Built.** `pulse_posts`, `pulse_post_reactions`, `news_sources`, `news_items`, `communities`,
`community_members`, `qa_questions`, `qa_answers`, `qa_votes`, `content_reports` and
`moderation_actions`, each row carrying source, trust label, confidence and city. Routes,
OpenAPI entries, codegen and a rewritten `feeds.tsx` that reads all four tabs from the API.
Submission routes for posts, questions and answers, rate limited per hour and gated behind
`COMMUNITY_SUBMISSIONS_ENABLED` so they stay closed until moderation is staffed — decision 2,
enforced by the code rather than by a habit. Ingestion runs from an allowlist of Mumbai sources
and files everything as `pending`; nothing an outside publisher says reaches a reader without an
editor publishing it. Reporting is one tap from every post, question, answer and news item, and
the response window shown to the reporter is the same one stamped on the queue: 24 hours for the
categories the IT Rules give 24 hours, 72 for the rest.

Three things changed shape in the process, and all three are the same decision:

- **Engagement counts are real.** The mock feed shipped posts with three thousand invented likes.
  Counts now come from `pulse_post_reactions`, start at zero, and a zero is not drawn.
- **There is no comment button**, because there are no comments. An affordance that does nothing
  is the same broken promise as a booking button with no booking behind it.
- **Seeded Pulse posts carry no image.** Every image in the catalogue is still stock, and 2.3 is
  explicit that a stock photo on a real named place destroys trust faster than no photo does.
  The cards render text-first until commissioned photography exists.

Still needed before submissions can be switched on: a named grievance officer
(`GRIEVANCE_OFFICER_NAME` / `_EMAIL`), a staffed queue, and a verified feed URL per news source.
Every source ships inactive because a feed endpoint is a fact to check with the publisher, not
one to guess.

### 2.2 City Guide

`artifacts/inmycity/app/(tabs)/cityguide.tsx` holds `CITY_META`, `INSIDER_TIPS`,
`NEIGHBORHOODS` and `CITY_AT_A_GLANCE` as hardcoded constants. `MUMBAI_LAUNCH_ZONES` is
already the better source of truth for neighborhoods.

Do:

- Make `MUMBAI_LAUNCH_ZONES` the single neighborhood source and drop the duplicate
  `NEIGHBORHOODS` constant.
- Move insider tips and city facts into the database so they are editable.
- Expand from 12 zone summaries to real neighborhood pages: what it is for, how to get
  there, what it costs, when to go, what to avoid, and the monsoon and safety notes that
  already exist in config.

**Built.** `NEIGHBORHOODS` is gone; `MUMBAI_LAUNCH_ZONES` is the only neighborhood source, and
each of the twelve now carries a written summary, ordered routes in, a per-person cost range,
what to avoid, and the anchors worth planning around — checked for completeness by a test, since
a missing field renders as a blank section rather than failing to compile. `CITY_META`,
`INSIDER_TIPS` and `CITY_AT_A_GLANCE` are rows in `city_guides`, `city_facts` and `insider_tips`,
served by `GET /api/city-guide`. Insider tips were dead code — defined and never rendered — and
now appear on both the City Guide and the neighborhood page they belong to.

One thing the old constants got wrong is worth naming: `CITY_AT_A_GLANCE` hardcoded `"INR (₹)"`
per city. Currency is resolved by `currencyFor` now and is deliberately absent from the schema,
so there is one fewer place for a Mumbai row to be priced in dollars.

### 2.3 Content operations

This is the part that decides whether the app is still good in month two.

- **Photography.** Every image is an Unsplash stock URL. Leopold Cafe shows a generic stock
  cafe. A Mumbai user recognises Bade Miyan on sight, and a wrong photo on a real named
  place destroys trust immediately. Commission or shoot real photos for every launch venue.
  This is the highest-visibility content task and the longest lead time — start it first.
- **Verification.** Confirm hours, phone numbers, addresses and prices for every Mumbai row.
  Record a `last_verified_at` timestamp and surface staleness internally.
- **Admin surface.** There is no way to fix a wrong phone number without a deploy. Build a
  protected CRUD interface for all content tables. This unblocks non-engineers and is a
  prerequisite for everything else in this section.
- **Non-destructive seeding.** `artifacts/api-server/src/seed.ts:8` opens by `DELETE`-ing
  every content table. Run against production it wipes live data, including anything
  referenced by user favorites and collections. Convert to idempotent upserts keyed on a
  stable external id, and add a guard that refuses to run destructively when
  `NODE_ENV=production`.
- **Freshness.** Events and deals decay fastest. Define ownership and cadence for adding
  events weekly and expiring stale deals automatically.
- **Volume target.** Set an explicit launch target per category. As a starting point: 300+
  places, 60+ activities, 40+ events live at any time, 30+ current deals, all 12 zones fully
  written.

**Built.** A protected CRUD surface over all fifteen content tables
([docs/admin-api.md](admin-api.md)), driven by a field registry rather than fifteen hand-written
routers — so a column that is not declared editable cannot be written at all, and a corrected
name rewrites `search_text` and `opening_hours_json` instead of leaving the row findable under
its old name. Deleting a place is refused while a favorite or a collection points at it. Every
edit, verification and takedown appends to `moderation_actions`.

`seed.ts` no longer opens by deleting every content table. It upserts on an `external_id` derived
from each row's natural key, refuses to run under `NODE_ENV=production` without an explicit
opt-in, and refuses the destructive path there outright. The first run against a database seeded
the old way backfills ids onto the existing rows, so the transition corrects the catalogue rather
than duplicating it.

`GET /api/admin/content-health` and `pnpm run content:maintain` report live volume against the
targets above and the rows overdue for verification, and the maintenance job deletes deals that
expired more than 30 days ago. Seeded deals and fixtures carried hardcoded 2025 dates, which meant
a fresh install had almost no live inventory — those are relative now.

**Not built, and not buildable in code.** Photography, venue verification, and the editorial
volume the targets describe. `content-health` currently reports Mumbai below target on places,
activities, events and deals; writing 300 real venues with verified hours and phone numbers is
the content-operations job the plan says has the longest lead time. The tooling to do it without
a deploy now exists, which was the prerequisite.

### 2.4 Movies, hotels and deals

These surfaces imply transactions the app cannot complete. "Now Showing" with no showtimes
and no booking teaches users the app is a mockup.

Decide per surface, and be honest in the UI about which it is:

- **Integrate.** Real showtimes and a booking handoff; a hotel availability partner; real
  redeemable deals with partner agreements.
- **Or reframe.** Present them as curated information rather than transaction — "what's
  worth watching", "where to stay in each neighborhood" — and remove the affordances that
  promise booking.

Either is defensible. Shipping the current in-between is not.

**Reframed, per decision 6.** No agreement exists, so the fallback applies and the booking
affordances are gone:

- Movies lose the "Book Tickets" button. Every `bookingUrl` in the seed was a cinema chain's
  homepage — not a booking link for this film at this venue. The column stays on the table for
  the eventual integration and stays empty; the detail screen shows the typical ticket price and
  where it is playing.
- Hotels lose "Book Now". The button opened the hotel's homepage and completed nothing; it now
  says "Hotel website", or offers a call when there is no site, and disappears when there is
  neither.
- Deals lose the fake QR block — an icon captioned "QR Code" with nothing behind it. The promo
  code the venue actually accepts is shown instead, and a deal reached by an old link now says it
  has ended rather than looking live.

The integration seam is unchanged: `bookingUrl` on movies, `website` on hotels, and `code` on
deals are where a real partner drops in.

### What is still open

Everything left in Phase 2 is a business or content dependency, not an engineering one:

| Item | Blocks | Owner |
| --- | --- | --- |
| Commission photography for launch venues | Every place showing a real photograph; seeded Pulse posts carrying images | Content ops |
| Verify hours, phone, address and price per Mumbai row | `content-health` reporting a verified catalogue | Content ops |
| Author to the volume targets (300+ places, 60+ activities, 40+ events, 30+ deals) | Launch readiness | Content ops |
| Name and staff a grievance officer; staff the moderation queue | Turning on `COMMUNITY_SUBMISSIONS_ENABLED` | Ops / legal |
| Verify a feed URL per allowlisted news source | Activating ingestion | Editorial |
| Ticketing, hotel and venue partner agreements | Replacing the 2.4 reframe with real transactions | Business |

---

## 7. Phase 3 — What makes Mumbai win

Roughly two to three weeks, and cheaper than expected because much of it already exists.

### 3.1 Reconnect the orphaned recommendations engine

`artifacts/api-server/src/routes/recommendations.ts` implements `GET /api/recommendations`
and `GET /api/neighborhoods`, accepting `mood`, `neighborhood`, `weatherMode=rain-safe`,
`transitAccess` and `budget`, and ranking Mumbai content against zone terms and intent.

**Neither endpoint appears in `lib/api-spec/openapi.yaml`**, so orval never generated hooks
for them and the app has no way to call them. The intent-based engine is built and
unreachable.

Do:

- Add both endpoints to the OpenAPI spec, run
  `corepack pnpm --filter @workspace/api-spec run codegen`, then `typecheck`.
- Wire the home screen's `DECISION_PLANS` cards to real recommendation queries instead of
  static routes. Today "Rain-safe plans" navigates to `/movies` and "Under Rs 1000"
  navigates to `/deals`.
- Wire zone selection on the home screen and City Guide into `neighborhood=<id>`.

This is the highest leverage work in the entire plan relative to its cost.

### 3.2 Monsoon mode

For four months a year, weather is the single biggest input to what a Mumbai user can
actually do, and the app has no weather awareness at all. Every zone already carries a
written `monsoonNote`.

Do:

- Integrate a weather source (IMD alerts plus a forecast API).
- When rain is active or forecast, automatically reorder Explore toward indoor and
  station-adjacent options, surface the zone's `monsoonNote`, and show an alert banner tied
  to the Pulse weather category.
- Give CityPilot live weather in its context so "what should I do tonight" accounts for
  actual conditions.

Nothing else in the market does this, and it is the clearest expression of "this app knows
my city".

### 3.3 Transit-native planning

Do not just list lines. Attach transit reality to plans: nearest station and walking time on
every place, "four stops on the Central line" framing for multi-stop plans, and rush-hour
awareness (avoid suggesting a 6pm Churchgate-to-Andheri hop).

### 3.4 Budget as a first-class filter

Rupee budget bands across places, deals, activities and events, wired to the existing
`priceBand` on zones and the `budget` param the recommendations route already accepts.

### 3.5 CityPilot depth

Currently the assistant receives 10 places, 8 events, 8 deals, 10 activities and 8 transit
lines (`artifacts/api-server/src/routes/ai.ts:88`) with no awareness of location, weather,
time of day, or the user's saved items. Add those, add conversation persistence — the
`conversations` and `messages` tables already exist and are unused by the chat flow — and
let answers link directly to in-app detail screens rather than describing places in prose.

---

## 8. Phase 4 — Launch operations

Runs in parallel from Phase 1 onward. Roughly two weeks of net effort.

- **Build and release.** No `eas.json` exists, so there is no build or submit pipeline at
  all. Create EAS build profiles (development, preview, production), set up TestFlight and
  Play internal testing, and configure OTA update channels.
- **CI.** No `.github/` directory. Add a workflow running `corepack pnpm run typecheck` and
  the build on every PR into `develop`.
- **Tests.** There is no test suite. Do not chase coverage; do add tests for the logic that
  is provably wrong today: opening-hours evaluation, distance and radius filtering, search
  ranking, and the recommendation intent matcher.
- **Crash and error reporting.** Sentry or equivalent, wired into both the app and the API,
  with source maps uploaded per release.
- **Analytics.** Instrument the funnel that tells you whether Mumbai is working: activation
  (first meaningful action), the decision loop (open → browse or ask → detail → directions
  or save), and D1/D7/D30 retention. Retention is the number that decides whether city two
  ever happens.
- **Push notifications.** Not yet wired. Needed for the Pulse alerts the UI already implies
  (IMD orange alerts, transit disruptions). Requires explicit opt-in and a preference screen.
- **Privacy and legal.** Required before store submission: a published privacy policy, an
  in-app account deletion path (an App Store requirement wherever account creation exists),
  a data retention policy, and DPDP Act alignment for Indian users — consent, purpose
  limitation, and grievance redressal.
- **Store presence.** Screenshots, description, keywords, an age rating, and a data safety
  form for Play. Budget real time for review cycles and expect at least one rejection.

---

## 9. Timeline

| Phase | Focus | Estimate |
| --- | --- | --- |
| 0 | Launch blockers | 2 weeks |
| 1 | Table stakes | 3–4 weeks |
| 2 | Make surfaces real | 6–8 weeks — engineering complete, content ops outstanding |
| 3 | Mumbai differentiation | 2–3 weeks |
| 4 | Launch ops (parallel) | 2 weeks |

**Total: roughly 16–20 weeks to a Mumbai closed beta**, assuming Phase 2 content work runs
in parallel with engineering and that photography starts immediately.

The critical path is Phase 2 content operations, not code. Photography and venue
verification have the longest lead times and the least ability to be compressed. Start them
in week one regardless of where engineering is.

---

## 10. Definition of done for Mumbai v1

- A first-time user reaches a useful, personalised recommendation within 60 seconds of
  install, without granting location.
- Every place shows a real photograph of that place.
- Open/closed status is correct at 11pm IST.
- Directions are two taps from any place.
- Search finds a dish, a venue and a neighborhood by their common Mumbai names.
- Pulse shows something that changed today, sourced and labelled.
- CityPilot answers "what should I do tonight" with in-app, currently-open, reachable
  options.
- The app is browsable on a train with intermittent signal.
- Content can be corrected without shipping a build.
- Nothing in the UI promises an action the app cannot complete.

---

## 11. Decisions

Resolved by the standing directive: build whatever is needed for inMyCity to win in Mumbai,
optimising for user experience, ease of use and simplicity.

1. **Maps — interactive.** Add `react-native-maps` with a provider, plus platform deep links
   for turn-by-turn. A city app without a map fails the bar. Carries a recurring cost and API
   key management; budget for it. Static images are the fallback only if provider cost proves
   prohibitive. Expands Phase 0.3.
2. **Pulse — editorial at launch, submission fast-follow.** Ship curated, sourced, labelled
   content on day one so Pulse is trustworthy and never empty. Build the submission and
   moderation stack in parallel and enable it once the moderation queue and grievance process
   are staffed. Trust before volume, per the vision doc.
3. **Language — English UI, multilingual search and content.** Mumbai app users overwhelmingly
   operate in English UI, and adding two more UI locales at launch multiplies content
   authoring and QA cost against the simplicity principle. But search must understand Hindi,
   Marathi, Hinglish and Devanagari input from day one (Phase 1.1), and CityPilot should
   answer in the language it is asked in. Revisit full UI localisation after launch on
   evidence.
4. **Saving without an account — yes.** Favorites and collections must work anonymously on
   device, then sync on first login. Requiring an account to save a restaurant violates the
   default-path principle and is a measurable activation killer. `savedPlans.ts` already does
   this locally for plans; extend the pattern to favorites and reconcile on sign-in.
5. **Hosting — Mumbai region.** Run the API and Postgres in `ap-south-1` (Mumbai) or an
   equivalent local region. Every user is in one metro; there is no reason to serve them
   across an ocean. Put images on a CDN with Indian edge presence.

### Still needs a call

6. **Movies, hotels and deals inventory.** The directive says build what is needed, and what
   is needed here is real inventory — showtimes and a booking handoff, hotel availability,
   redeemable partner deals. That is a **business dependency, not an engineering one**: it
   requires commercial agreements with a ticketing partner, a hotel aggregator, and
   individual venues. Engineering can build the integration layer against any of them in
   roughly two weeks each once agreements exist.

   Until an agreement is signed, the fallback under the "never promise what the app cannot
   do" principle is to present these as curated information and remove booking affordances.
   Needed: a decision on which partners to pursue and who owns those conversations, because
   the lead time is commercial and long.
