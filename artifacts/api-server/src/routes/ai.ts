import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";
import { MUMBAI_LAUNCH_ZONES, isLaunchCity } from "@workspace/city-config";
import {
  activitiesTable,
  dealsTable,
  eventsTable,
  placesTable,
  transitLinesTable,
  db,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const CITY_KNOWLEDGE: Record<string, string> = {
  mumbai: `Mumbai is India's financial capital and most populous city (population ~20 million). Key facts:
- Neighborhoods: Bandra (hipster, cafes, nightlife), Colaba (tourist hub, Gateway of India), Juhu (beach, Bollywood), Worli (business, Sea Link), Dadar (market hub), Andheri (commercial, airport area), Lower Parel (malls, corporate), Powai (tech hub, lake).
- Local trains: Lifeline of the city. Western Line (Churchgate–Virar), Central Line (CSMT–Kasara/Karjat), Harbour Line. Rush hours 8–10am and 5–8pm. Buy smart card or paper tickets at station.
- Food: Vada Pav (ubiquitous street snack), Pav Bhaji at Juhu Beach, Bhel Puri at Chowpatty, Bombay Sandwich, seafood at Mahesh Lunch Home, butter chicken at Bade Miyan.
- Must-visit: Gateway of India, Elephanta Caves (ferry from Gateway), Marine Drive, Dharavi (Asia's largest slum), Haji Ali Dargah, Sanjay Gandhi National Park.
- Auto-rickshaws: Available in suburbs only (not South Mumbai). Cabs: Ola/Uber widely available.
- Climate: Monsoon June–September (heavy rains, flooding possible), Hot March–May, Pleasant October–February.
- Language: Marathi (official), Hindi, English widely spoken.
- Best beaches: Juhu, Versova, Aksa, Girgaon Chowpatty.
- Shopping: Colaba Causeway (street shopping), Linking Road Bandra, Phoenix Palladium, Infiniti Mall, Crawford Market (wholesale).`,

  bangalore: `Bangalore (Bengaluru) is India's Silicon Valley (population ~13 million). Key facts:
- Neighborhoods: Koramangala (startups, cafes, pubs), Indiranagar (nightlife, restaurants), MG Road/Brigade Road (shopping, commercial), Whitefield (IT hub, gated communities), Electronic City (tech parks), HSR Layout (young professionals), Jayanagar (old city charm), Malleshwaram (traditional).
- Metro: Namma Metro has Purple Line (Whitefield–Challaghatta) and Green Line (Silk Institute–Nagasandra). Expanding network.
- Food: Filter coffee at iconic Darshinis, Masala Dosa at MTR or Vidyarthi Bhavan, Bisi Bele Bath, North Karnataka cuisine, Thatte Idli, craft beer at Toit or Arbor Brewing.
- Must-visit: Lalbagh Botanical Garden, Cubbon Park, Tipu Sultan's Summer Palace, ISKCON Temple, Vidhana Soudha, Nandi Hills (60km drive).
- Weather: Pleasant year-round (nicknamed Air-Conditioned City), 15–32°C. Monsoon June–September.
- Traffic: Heavy; use metro when possible. Autos use meter; Ola/Uber available.
- Language: Kannada (official), Hindi, English spoken widely.
- Pubs/nightlife: Indiranagar 100 Feet Road, Koramangala, Church Street. Last call typically 1am.
- Tech companies: Wipro, Infosys, HAL area; many MNCs in Whitefield and Electronic City.`,

  "new-york": `New York City is the most populous US city (population ~8.3 million). Key facts:
- Boroughs: Manhattan (urban core), Brooklyn (trendy, diverse), Queens (multicultural), Bronx (culture, the Bronx Zoo), Staten Island (suburban).
- Neighborhoods: Midtown (Times Square, business), Upper East/West Side (residential, museums), SoHo (shopping), Greenwich Village (bohemian), Williamsburg Brooklyn (hipster), Flushing Queens (best Asian food), Harlem (culture, jazz).
- Subway: MTA subway runs 24/7. Use OMNY tap-to-pay or MetroCard. $2.90 per ride. Key lines: 1/2/3 (West Side), 4/5/6 (East Side), A/C/E, B/D/F/M, L (Brooklyn–Midtown).
- Food: NYC pizza (Joe's, Di Fara), bagels, deli sandwiches, halal cart street food, Chinatown dim sum, Russ & Daughters bagels, Keens Steakhouse.
- Must-visit: Central Park, Metropolitan Museum of Art, Brooklyn Bridge, Statue of Liberty (ferry from Battery Park), High Line, Times Square, 9/11 Memorial.
- Taxis: Yellow cabs in Manhattan; ride-shares (Lyft/Uber) citywide. JFK airport: AirTrain + subway or express bus.
- Climate: Hot summers (30°C+), cold winters (often snowing), spring/fall pleasant.
- Shopping: 5th Avenue (luxury), SoHo (boutiques), Canal Street (budget), Brooklyn Flea.`,

  "san-francisco": `San Francisco is a global tech hub city (population ~875,000). Key facts:
- Neighborhoods: Mission (Latino culture, murals, taquerias), Castro (LGBTQ+ hub), Haight-Ashbury (hippie history), SoMa (tech, nightlife), North Beach (Italian, City Lights bookstore), Chinatown (oldest in North America), Nob Hill (historic mansions), Marina (young professionals, waterfront).
- Transit: BART (Bay Area Rapid Transit) connects SF to Oakland, Berkeley, airport. Muni (buses, light rail, cable cars). Cable cars: tourist favorite, expensive ($8).
- Food: Mission burritos (La Taqueria, El Farolito), Dungeness crab at Fisherman's Wharf, sourdough bread (Boudin), dim sum in Chinatown, Tartine Bakery pastries, Blue Bottle Coffee.
- Must-visit: Golden Gate Bridge (walk or bike across), Alcatraz (book in advance), Fisherman's Wharf, Lombard Street, Painted Ladies Victorian houses, Ferry Building Marketplace, Muir Woods (30min drive).
- Tech scene: Silicon Valley is 30–45 min south. Caltrain from downtown connects to Mountain View, Palo Alto, San Jose.
- Climate: Mild but foggy year-round. Mark Twain's "coldest winter" quote. Layers always needed. Fog (Karl) is strongest May–August mornings.
  - Uber/Lyft originated here; widely used. Parking very expensive.`,
};

function buildSystemPrompt(city: string): string {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, "-");
  const cityKnowledge = CITY_KNOWLEDGE[normalizedCity] || "";

  return `You are CityPilot, the AI city companion inside inMyCity. For launch, your job is to help Mumbai locals make practical decisions: what to do now, tonight, this weekend, within budget, near transit, and with Mumbai-specific constraints like monsoon, traffic, local trains, metro access, and neighborhood fit.

You are currently set to: ${city}

${cityKnowledge ? `## Your ${city} Knowledge Base\n${cityKnowledge}\n` : ""}

## Your Behavior
- Be conversational, concise, and genuinely helpful. Avoid long walls of text.
- Prefer actionable mini-plans over generic lists.
- For Mumbai, mention practical details: neighborhood, travel friction, budget, best time, rain-safe backup, and why it fits.
- When app context is provided, prioritize those places, deals, events, activities, and transit lines over generic recommendations.
- For hyper-specific real-time info (today's events, current wait times, live prices, today's weather) that you cannot verify, say: "I don't have live data on that, but here's what I know generally..." and give your best answer based on typical patterns.
- Always be warm and local-feeling, like a knowledgeable friend who lives in ${city}.
- Keep answers short and actionable unless the user asks for detail.
- If asked about another city, politely note you're specialized for ${city} but can still try to help.
- Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

async function getMumbaiAppContext() {
  const [places, events, deals, activities, transitLines] = await Promise.all([
    db.select().from(placesTable).where(eq(placesTable.city, "Mumbai")).limit(10),
    db.select().from(eventsTable).where(eq(eventsTable.city, "Mumbai")).limit(8),
    db.select().from(dealsTable).where(eq(dealsTable.city, "Mumbai")).limit(8),
    db.select().from(activitiesTable).where(eq(activitiesTable.city, "Mumbai")).limit(10),
    db.select().from(transitLinesTable).where(eq(transitLinesTable.city, "Mumbai")).limit(8),
  ]);

  return [
    "## inMyCity Mumbai App Context",
    "Use these app entities when they fit the user's intent. Include clear next actions like view, save, route, or ask for a narrower area.",
    "",
    "### Launch neighborhoods",
    ...MUMBAI_LAUNCH_ZONES.map(
      (zone) => `- ${zone.name}: ${zone.vibe}; best for ${zone.bestFor.join(", ")}; transit: ${zone.transitAccess}; monsoon: ${zone.monsoonNote}`,
    ),
    "",
    "### Places",
    ...places.map((item) => `- ${item.name} (${item.category}) — ${item.address}; rating ${item.rating ?? "new"}; tags ${(item.tags ?? []).join(", ")}`),
    "",
    "### Events",
    ...events.map((item) => `- ${item.title} — ${item.venue}; ${item.category}; price ${item.price ?? "varies"}`),
    "",
    "### Deals",
    ...deals.map((item) => `- ${item.title} — ${item.placeName}; ${item.discountText}; price ${item.dealPrice ?? "varies"}`),
    "",
    "### Activities",
    ...activities.map((item) => `- ${item.name} — ${item.address}; ${item.durationMinutes ?? 60} min; price ${item.price ?? 0}; tags ${(item.tags ?? []).join(", ")}`),
    "",
    "### Transit",
    ...transitLines.map((item) => `- ${item.name} (${item.shortName ?? item.type}) — ${item.from} to ${item.to}; ${item.frequency ?? "frequency varies"}`),
  ].join("\n");
}

async function buildMumbaiFallbackAnswer(message: string) {
  const normalized = message.toLowerCase();
  const wantsBudget = normalized.includes("1000") || normalized.includes("budget") || normalized.includes("cheap");
  const wantsRainSafe = normalized.includes("rain") || normalized.includes("monsoon") || normalized.includes("indoor");
  const wantsBandra = normalized.includes("bandra");
  const wantsDate = normalized.includes("date");

  const [places, events, deals, activities] = await Promise.all([
    db.select().from(placesTable).where(eq(placesTable.city, "Mumbai")).limit(20),
    db.select().from(eventsTable).where(eq(eventsTable.city, "Mumbai")).limit(8),
    db.select().from(dealsTable).where(eq(dealsTable.city, "Mumbai")).limit(8),
    db.select().from(activitiesTable).where(eq(activitiesTable.city, "Mumbai")).limit(8),
  ]);

  const bandraPlaces = places.filter((item) =>
    `${item.name} ${item.address} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes("bandra"),
  );
  const indoorPlaces = places.filter((item) =>
    `${item.category} ${(item.tags ?? []).join(" ")}`.toLowerCase().match(/cafe|mall|museum|cinema|shopping|food|bar/),
  );
  const budgetDeals = deals.filter((item) => item.dealPrice == null || item.dealPrice <= 1000);

  const picks = [
    ...(wantsBandra ? bandraPlaces : []),
    ...(wantsRainSafe ? indoorPlaces : []),
    ...(wantsBudget ? budgetDeals : deals),
    ...activities,
    ...events,
    ...places,
  ].slice(0, 4);

  const pickLines = picks.map((item, index) => {
    const title = "name" in item ? item.name : item.title;
    const place = "address" in item ? item.address : "venue" in item ? item.venue : "placeName" in item ? item.placeName : "Mumbai";
    const price =
      "dealPrice" in item && item.dealPrice != null
        ? `Rs ${item.dealPrice}`
        : "price" in item && item.price != null
          ? `Rs ${item.price}`
          : "Free or varies";
    return `${index + 1}. ${title} - ${place}. ${price}.`;
  });

  const opening =
    "I am using inMyCity's local Mumbai data right now. OpenAI is configured, but the current API key/project has no usable quota, so here is a grounded local plan:";

  const planType = wantsDate
    ? "For a date night, keep the plan compact and avoid long cross-city hops."
    : wantsRainSafe
      ? "For rain-safe Mumbai plans, prefer indoor food, mall, cinema, cafe, and short station-linked hops."
      : "For an easy Mumbai evening, keep travel friction low and build around one neighborhood.";

  return [
    opening,
    "",
    planType,
    "",
    pickLines.join("\n") || "1. Start with Bandra or Lower Parel, then narrow by budget, rain, and how far you want to travel.",
    "",
    "Suggested flow: pick one anchor spot, add one nearby food stop, keep a rain-safe backup, then route by local train/metro or cab depending on the area.",
  ].join("\n");
}

router.post("/ai/chat", async (req, res) => {
  if (!openai) {
    res.status(503).json({ error: "OpenAI is not configured" });
    return;
  }

  const { message, city, history } = req.body as {
    message: string;
    city: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (!city || typeof city !== "string") {
    res.status(400).json({ error: "city is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const systemPrompt = [
      buildSystemPrompt(city),
      isLaunchCity(city) ? await getMumbaiAppContext() : "",
    ].filter(Boolean).join("\n\n");

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "AI chat error");
    const fallback = isLaunchCity(city)
      ? await buildMumbaiFallbackAnswer(message)
      : "OpenAI is temporarily unavailable. Try again after checking the API key quota or billing.";
    res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
