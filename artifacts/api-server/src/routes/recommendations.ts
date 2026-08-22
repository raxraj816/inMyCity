import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  MUMBAI_LAUNCH_PROMPTS,
  MUMBAI_LAUNCH_ZONES,
  formatPriceForCity,
  isLaunchCity,
} from "@workspace/city-config";
import {
  activitiesTable,
  dealsTable,
  eventsTable,
  placesTable,
  transitLinesTable,
  db,
} from "@workspace/db";

const router: IRouter = Router();

const LAUNCH_CITY = "Mumbai";

const EMPTY_FILTERS = {
  mood: null,
  neighborhood: null,
  budget: null,
  weatherMode: null,
  transitAccess: null,
};

function normalize(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEventDate(value: Date | string | null | undefined) {
  if (!value) return "Date TBA";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getZoneTerms(zoneId?: string) {
  if (!zoneId) return [];
  const zone = MUMBAI_LAUNCH_ZONES.find((item) => item.id === zoneId);
  if (!zone) return [titleCase(zoneId.replace(/-/g, " "))];
  return [zone.name, ...zone.bestFor];
}

function matchesIntent(tags: string[] | null | undefined, text: string, terms: string[]) {
  const haystack = `${text} ${(tags ?? []).join(" ")}`.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

router.get("/neighborhoods", (req, res) => {
  const city = normalize(req.query.city) ?? "mumbai";
  if (!isLaunchCity(city)) {
    res.json([]);
    return;
  }

  res.json(MUMBAI_LAUNCH_ZONES);
});

router.get("/recommendations", async (req, res) => {
  const city = normalize(req.query.city) ?? "mumbai";
  if (!isLaunchCity(city)) {
    res.json({
      city: LAUNCH_CITY,
      title: "Mumbai launch recommendations",
      filters: EMPTY_FILTERS,
      prompts: MUMBAI_LAUNCH_PROMPTS,
      neighborhoods: MUMBAI_LAUNCH_ZONES,
      items: [],
    });
    return;
  }

  const mood = normalize(req.query.mood);
  const neighborhood = normalize(req.query.neighborhood);
  const weatherMode = normalize(req.query.weatherMode);
  const transitAccess = normalize(req.query.transitAccess);
  const budget = req.query.budget ? Number(req.query.budget) : undefined;

  const intentTerms = [
    ...(mood ? [mood] : []),
    ...(weatherMode === "rain-safe" ? ["indoor", "movie", "mall", "cafe", "museum", "covered"] : []),
    ...(transitAccess ? ["train", "metro", "station", "transit"] : []),
    ...getZoneTerms(neighborhood),
  ];

  const [places, activities, deals, events, transitLines] = await Promise.all([
    db.select().from(placesTable).where(eq(placesTable.city, LAUNCH_CITY)).limit(80),
    db.select().from(activitiesTable).where(eq(activitiesTable.city, LAUNCH_CITY)).limit(80),
    db.select().from(dealsTable).where(eq(dealsTable.city, LAUNCH_CITY)).limit(40),
    db.select().from(eventsTable).where(eq(eventsTable.city, LAUNCH_CITY)).limit(40),
    db
      .select()
      .from(transitLinesTable)
      .where(eq(transitLinesTable.city, LAUNCH_CITY))
      .limit(12),
  ]);

  const scored = [
    ...places.map((item) => ({
      id: `place-${item.id}`,
      entityType: "place",
      entityId: item.id,
      title: item.name,
      neighborhood: item.address,
      imageUrl: item.imageUrl,
      reason: "A strong Mumbai spot for a quick plan.",
      actionLabel: "View place",
      route: `/place/${item.id}`,
      tags: item.tags ?? [],
      scoreText: `${item.category} · ${item.rating ?? "new"} rating`,
      rankBoost: matchesIntent(item.tags, `${item.name} ${item.address} ${item.category}`, intentTerms) ? 3 : 0,
    })),
    ...activities
      .filter((item) => !budget || item.price == null || item.price <= budget)
      .map((item) => ({
      id: `activity-${item.id}`,
      entityType: "activity",
      entityId: item.id,
      title: item.name,
      neighborhood: item.address,
      imageUrl: item.imageUrl,
      reason: item.price === 0 ? "Free Mumbai plan with low friction." : "A ready-to-do Mumbai activity.",
      actionLabel: "Explore activity",
      route: `/activity/${item.id}`,
      tags: item.tags ?? [],
      scoreText: `${item.durationMinutes ?? 60} min · ${
        item.price ? formatPriceForCity(item.price, LAUNCH_CITY, item.currency) : "Free"
      }`,
      rankBoost: matchesIntent(item.tags, `${item.name} ${item.address} ${item.category}`, intentTerms) ? 4 : 1,
      })),
    ...deals
      .filter((item) => !budget || item.dealPrice == null || item.dealPrice <= budget)
      .map((item) => ({
      id: `deal-${item.id}`,
      entityType: "deal",
      entityId: item.id,
      title: item.title,
      neighborhood: item.placeName,
      imageUrl: item.imageUrl,
      reason: "Good value for a Mumbai outing.",
      actionLabel: "See deal",
      route: `/deal/${item.id}`,
      tags: [item.category],
      scoreText: item.discountText ?? "Deal",
      rankBoost: matchesIntent([item.category], `${item.title} ${item.placeName ?? ""}`, intentTerms) ? 4 : 1,
      })),
    ...events.map((item) => ({
      id: `event-${item.id}`,
      entityType: "event",
      entityId: item.id,
      title: item.title,
      neighborhood: item.venue,
      imageUrl: item.imageUrl,
      reason: "Time-bound plan worth checking before it passes.",
      actionLabel: "View event",
      route: `/event/${item.id}`,
      tags: item.tags ?? [],
      scoreText: `${titleCase(item.category)} · ${formatEventDate(item.startDate)}`,
      rankBoost: matchesIntent(item.tags, `${item.title} ${item.venue} ${item.category}`, intentTerms) ? 4 : 2,
    })),
    ...transitLines.map((item) => ({
      id: `transit-${item.id}`,
      entityType: "transit",
      entityId: item.id,
      title: item.name,
      neighborhood: `${item.from} to ${item.to}`,
      imageUrl: null,
      reason: "Helpful for planning around local train or metro access.",
      actionLabel: "View route",
      route: `/transit/line/${item.id}`,
      tags: item.tags ?? [],
      scoreText: `${item.shortName} · ${item.frequency}`,
      rankBoost: transitAccess ? 5 : 0,
    })),
  ];

  const items = scored
    .sort((a, b) => b.rankBoost - a.rankBoost)
    .slice(0, 12)
    .map(({ rankBoost: _rankBoost, ...item }) => item);

  res.json({
    city: LAUNCH_CITY,
    title: "Mumbai plans and decisions",
    filters: {
      mood: mood ?? null,
      neighborhood: neighborhood ?? null,
      budget: budget ?? null,
      weatherMode: weatherMode ?? null,
      transitAccess: transitAccess ?? null,
    },
    prompts: MUMBAI_LAUNCH_PROMPTS,
    neighborhoods: MUMBAI_LAUNCH_ZONES,
    items,
  });
});

export default router;
