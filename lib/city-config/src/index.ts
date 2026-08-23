import { CURRENCIES, DEFAULT_CURRENCY, formatPrice, type Currency } from "./currency";

export type CityStatus = "live" | "soon" | "demo";

export type SupportedCity = {
  id: string;
  name: string;
  displayName: string;
  country: string;
  state: string;
  lat: number;
  lng: number;
  status: CityStatus;
  tagline: string;
  /** ISO 4217 code, resolved to a symbol and grouping by `currencyFor`. */
  currencyCode: string;
  /** Other names this city appears under in content, so lookups by name still resolve. */
  aliases?: string[];
  launchNote?: string;
};

export type MumbaiLaunchZone = {
  id: string;
  name: string;
  vibe: string;
  bestFor: string[];
  transitAccess: string;
  priceBand: "free" | "budget" | "mid" | "premium" | "mixed";
  bestTime: string;
  monsoonNote: string;
  safetyContext: string;
  /** What the neighbourhood is for, in the words a resident would use to describe it. */
  summary: string;
  /** How to arrive, in the order someone here would actually try. */
  gettingThere: string[];
  /**
   * Typical spend per person for a few hours here, as bare numbers in the city's own
   * currency. Screens render these through `formatPriceForCity` — never with a symbol
   * written into the copy — so the same field stays correct if the zone model is reused.
   */
  costPerPerson: { min: number; max: number };
  /** What that range buys, and where it breaks. No currency symbols: see `costPerPerson`. */
  costNote: string;
  /** The mistakes that make a first visit go badly. */
  avoid: string[];
  /** The handful of anchors worth building a plan around. */
  highlights: string[];
};

export type LaunchPrompt = {
  id: string;
  label: string;
  prompt: string;
  icon: string;
};

export const DEFAULT_CITY_ID = "mumbai";

export const SUPPORTED_CITIES: SupportedCity[] = [
  {
    id: "mumbai",
    name: "Mumbai",
    displayName: "Mumbai, Maharashtra",
    country: "India",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    status: "live",
    currencyCode: "INR",
    tagline: "Know what to do next in Mumbai",
  },
  {
    id: "bangalore",
    name: "Bangalore",
    displayName: "Bangalore, Karnataka",
    country: "India",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    status: "soon",
    currencyCode: "INR",
    tagline: "Launching after Mumbai",
    launchNote: "Coming after Mumbai v1 proves repeat local decisions.",
  },
  {
    id: "delhi",
    name: "Delhi",
    displayName: "Delhi, India",
    country: "India",
    state: "Delhi",
    lat: 28.7041,
    lng: 77.1025,
    status: "soon",
    currencyCode: "INR",
    tagline: "Heart of India",
  },
  {
    id: "pune",
    name: "Pune",
    displayName: "Pune, Maharashtra",
    country: "India",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    status: "soon",
    currencyCode: "INR",
    tagline: "Oxford of the East",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    displayName: "Hyderabad, Telangana",
    country: "India",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    status: "soon",
    currencyCode: "INR",
    tagline: "City of Pearls",
  },
  {
    id: "chennai",
    name: "Chennai",
    displayName: "Chennai, Tamil Nadu",
    country: "India",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    status: "soon",
    currencyCode: "INR",
    tagline: "Gateway to South India",
  },
  {
    id: "new-york",
    name: "New York",
    aliases: ["New York City"],
    displayName: "New York, USA",
    country: "USA",
    state: "New York",
    lat: 40.7128,
    lng: -74.006,
    status: "demo",
    currencyCode: "USD",
    tagline: "Internal demo city",
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    displayName: "San Francisco, USA",
    country: "USA",
    state: "California",
    lat: 37.7749,
    lng: -122.4194,
    status: "demo",
    currencyCode: "USD",
    tagline: "Internal demo city",
  },
];

/**
 * The currency to price something in.
 *
 * `currencyCode` is the row's own currency where the table carries one — hotels and
 * activities both do, and a row knows its own price better than the city around it does.
 * `city` accepts either an id or a display name, because callers have one or the other.
 * Anything unrecognised falls back to the launch city's currency rather than to dollars.
 */
export function currencyFor(
  city?: string | null,
  currencyCode?: string | null,
): Currency {
  const fromCode = currencyCode ? CURRENCIES[currencyCode.toUpperCase()] : undefined;
  if (fromCode) return fromCode;

  if (city) {
    const needle = city.trim().toLowerCase();
    const match = SUPPORTED_CITIES.find(
      (candidate) =>
        candidate.id === needle ||
        candidate.name.toLowerCase() === needle ||
        candidate.aliases?.some((alias) => alias.toLowerCase() === needle),
    );
    if (match) return CURRENCIES[match.currencyCode] ?? DEFAULT_CURRENCY;
  }

  return DEFAULT_CURRENCY;
}

/** `formatPrice` with the lookup folded in, for callers formatting a single price. */
export function formatPriceForCity(
  amount: number,
  city?: string | null,
  currencyCode?: string | null,
): string {
  return formatPrice(amount, currencyFor(city, currencyCode));
}

export const MUMBAI_LAUNCH_ZONES: MumbaiLaunchZone[] = [
  {
    id: "bandra",
    name: "Bandra",
    vibe: "food, nightlife, cafes, sea-facing evenings",
    bestFor: ["date night", "food crawl", "creator spots"],
    transitAccess: "Bandra station, autos, ride-hailing, Western Line",
    priceBand: "mixed",
    bestTime: "evening after 5pm",
    monsoonNote: "Good for cafes and indoor dinner plans when rain hits.",
    safetyContext: "Busy and well-lit in main lanes; plan rides late at night.",
    summary:
      "The suburb Mumbai goes to when it wants an evening rather than an errand. Bandra West packs restaurants, bars, small designer shops and two sea-facing promenades into roughly two walkable square kilometres, and unlike most of the city it stays interesting on foot from about 5pm until midnight.",
    gettingThere: [
      "Western Line to Bandra, then a 10-minute auto to Hill Road or Pali Naka — the station itself is a long walk from the good part.",
      "From South Mumbai, a cab over the Bandra–Worli Sea Link is the fastest route outside peak hours.",
      "From the airport or Andheri, the Western Express Highway to Bandra East, then across via the flyover.",
    ],
    costPerPerson: { min: 300, max: 2500 },
    costNote:
      "The low end is street food at Pali Naka and a walk on Carter Road. The high end is a sit-down dinner with drinks in a Waterfield Road restaurant. Most evenings land near the middle.",
    avoid: [
      "Driving on a Friday or Saturday evening — parking on Hill Road and Linking Road effectively does not exist.",
      "Confusing Bandra East with Bandra West. They are separated by the station and about half an hour of traffic.",
      "Bandstand and Carter Road at high tide during monsoon; the sea comes over the wall.",
    ],
    highlights: [
      "Carter Road and Bandstand promenades at sunset",
      "Pali Naka and Chapel Road for food and street art",
      "Linking Road and Hill Road for shopping",
      "Mount Mary Church and the steps below it",
    ],
  },
  {
    id: "andheri",
    name: "Andheri",
    vibe: "work hubs, cafes, cinema, metro access",
    bestFor: ["after-work plans", "movies", "metro-friendly meetups"],
    transitAccess: "Western Line, Metro Line 1, airport corridor",
    priceBand: "mixed",
    bestTime: "weekday evenings",
    monsoonNote: "Metro is the safer bet during heavy road traffic.",
    safetyContext: "Station areas get crowded; keep plans close to transit.",
    summary:
      "Where a very large share of Mumbai actually works, and therefore where a very large share of Mumbai's weeknight plans happen. Andheri West has the cafes, cinemas and Versova's beach edge; Andheri East has the offices, hotels and the airport. The station between them is the city's busiest rail–metro interchange.",
    gettingThere: [
      "Western Line to Andheri, which is also the Metro Line 1 interchange for Ghatkopar and the eastern suburbs.",
      "Metro Line 1 from Ghatkopar avoids the Andheri–Kurla Road entirely, which in the evening is worth a great deal.",
      "From the airport, both terminals are 15–25 minutes away depending on which side of the station you want.",
    ],
    costPerPerson: { min: 250, max: 1800 },
    costNote:
      "A cinema ticket and a meal at Lokhandwala sits at the low end; a Yari Road dinner or a hotel bar in Andheri East sits at the top.",
    avoid: [
      "Crossing between Andheri East and West at 9am or 7pm — the subway and bridge crawl can take longer than the train ride.",
      "Booking anything on Andheri–Kurla Road with a tight arrival time.",
      "Assuming Versova beach is swimmable. It is a walk-and-watch beach, not a swim one.",
    ],
    highlights: [
      "Versova beach and the Yari Road cafe strip",
      "Lokhandwala market and its food lanes",
      "Infiniti Mall and the cinema cluster",
      "Gilbert Hill, a 66-metre basalt column in the middle of the suburb",
    ],
  },
  {
    id: "juhu",
    name: "Juhu",
    vibe: "beach, snacks, casual dates, family walks",
    bestFor: ["family day", "sunset", "street food"],
    transitAccess: "Vile Parle/Santacruz plus auto or cab",
    priceBand: "mixed",
    bestTime: "sunset and early evenings",
    monsoonNote: "Avoid high-tide beach walks; pick nearby cafes instead.",
    safetyContext: "Beachfront is busy; stay around active stretches after dark.",
    summary:
      "Mumbai's default family evening. A six-kilometre beach with a chaat stretch at the northern end, a theatre that has run for fifty years behind it, and enough of a crowd that it never feels isolated. It is loud, sandy and completely unpretentious.",
    gettingThere: [
      "Western Line to Vile Parle or Santacruz, then a 15-minute auto to Juhu Chowpatty.",
      "Metro Line 1 to DN Nagar, then an auto west.",
      "By car from Bandra along Juhu Tara Road, which is scenic and slow in equal measure.",
    ],
    costPerPerson: { min: 100, max: 1500 },
    costNote:
      "Beach chaat and a walk costs very little. A Prithvi Cafe meal or a Juhu Tara Road restaurant dinner is where the range opens up.",
    avoid: [
      "Swimming. The water quality and the undertow both argue against it, and lifeguard cover is thin.",
      "The beach at high tide during monsoon — the sand strip disappears and the water carries debris.",
      "Driving here on a Sunday evening unless you enjoy stationary traffic on Juhu Tara Road.",
    ],
    highlights: [
      "Juhu Chowpatty at sunset, and the chaat stalls behind it",
      "Prithvi Theatre and its cafe",
      "ISKCON Juhu",
      "The quieter southern stretch of the beach toward Juhu Tara",
    ],
  },
  {
    id: "colaba",
    name: "Colaba",
    vibe: "heritage, cafes, shopping, tourist classics",
    bestFor: ["visitor day", "heritage walk", "shopping"],
    transitAccess: "CSMT/Churchgate plus cab or bus",
    priceBand: "mixed",
    bestTime: "late morning to evening",
    monsoonNote: "Good rain-safe museums, cafes, and covered shopping breaks.",
    safetyContext: "Tourist-heavy; watch bags in crowded lanes.",
    summary:
      "The tip of the island, and the part of Mumbai most visitors see first. Colaba is stone arcades, the Gateway of India, a causeway of street stalls, and a set of cafes that have been serving the same things since before independence. It is touristy and also genuinely good.",
    gettingThere: [
      "Western Line to Churchgate or Central Line to CSMT, then a 10–15 minute cab or bus south.",
      "Metro Line 3 to Cuffe Parade or Vidhan Bhavan puts you within walking distance of the northern end.",
      "The Gateway is the ferry point for Elephanta, so arriving by boat is a real option.",
    ],
    costPerPerson: { min: 200, max: 3000 },
    costNote:
      "A Causeway lunch and a museum ticket is modest. A Taj-adjacent dinner is not. Bargaining on the Causeway typically lands around half the opening price.",
    avoid: [
      "Paying the first price quoted on Colaba Causeway. It is a bargaining street and everyone knows it except you.",
      "Walking the Causeway between noon and 3pm in April or May. There is very little shade.",
      "Assuming the Gateway area is quiet at any hour. It is not, ever.",
    ],
    highlights: [
      "Gateway of India and the Taj Mahal Palace facade",
      "Colaba Causeway street market",
      "Leopold Cafe and Cafe Mondegar",
      "Sassoon Dock at dawn, when the fishing boats come in",
    ],
  },
  {
    id: "fort",
    name: "Fort",
    vibe: "architecture, offices, museums, old Bombay",
    bestFor: ["solo exploring", "heritage", "lunch breaks"],
    transitAccess: "CSMT, Churchgate, buses, taxis",
    priceBand: "budget",
    bestTime: "morning and lunch hours",
    monsoonNote: "Arcades and cafes make it usable during short showers.",
    safetyContext: "Quiet after office hours in some lanes.",
    summary:
      "The densest concentration of Victorian Gothic and Art Deco architecture anywhere outside Europe, functioning as an ordinary office district. Fort is best experienced on foot at lunchtime on a weekday, when the Irani cafes are full and the buildings are doing their day jobs.",
    gettingThere: [
      "Central Line to CSMT or Western Line to Churchgate. Both stations are inside the district — no onward transport needed.",
      "Metro Line 3 to Hutatma Chowk or Kalbadevi for the northern edge.",
      "Almost all of Fort is walkable from either station in under fifteen minutes.",
    ],
    costPerPerson: { min: 150, max: 900 },
    costNote:
      "This is a cheap neighbourhood to spend a day in. An Irani cafe lunch, a museum ticket and a coffee is the whole budget for most visits.",
    avoid: [
      "Sunday. Fort is an office district and most of it, including several of the cafes, simply shuts.",
      "Expecting evening life. After about 8pm the lanes empty out quickly.",
      "Britannia & Co. after 4pm — it is a lunch-only institution and closes early.",
    ],
    highlights: [
      "Kala Ghoda and the Jehangir Art Gallery",
      "Horniman Circle and the Asiatic Society steps",
      "CSMT, which is a UNESCO site and also a working terminus",
      "Britannia & Co. and Yazdani Bakery",
    ],
  },
  {
    id: "lower-parel",
    name: "Lower Parel",
    vibe: "malls, restaurants, offices, nightlife",
    bestFor: ["date night", "payday plans", "after-work dinner"],
    transitAccess: "Lower Parel/Prabhadevi plus cabs",
    priceBand: "premium",
    bestTime: "evenings and weekends",
    monsoonNote: "Strong indoor fallback zone during heavy rain.",
    safetyContext: "Plan cab pickup points around busy mall exits.",
    summary:
      "Cotton mills turned into restaurants, offices and two large malls. Lower Parel is where central Mumbai eats and drinks when it wants a booking rather than a stall, and it is the most reliable rain-proof evening in the city because almost all of it is indoors.",
    gettingThere: [
      "Western Line to Lower Parel or Prabhadevi, then a short walk or a five-minute auto.",
      "Central Line to Currey Road for the eastern side of the mills.",
      "Monorail to Lower Parel connects it to the eastern corridor.",
    ],
    costPerPerson: { min: 600, max: 4000 },
    costNote:
      "The cheapest realistic evening here is a mall food court and a film. A Kamala Mills dinner with drinks runs several times that, and the bars do not pretend otherwise.",
    avoid: [
      "The Lower Parel station footbridge at 9am or 7pm. It is one of the worst pinch points on the Western Line.",
      "Driving into Kamala Mills on a Friday night without a plan for parking.",
      "Assuming a walk-in table. Almost everything here takes bookings and uses them.",
    ],
    highlights: [
      "Kamala Mills and Todi Mills restaurant compounds",
      "Phoenix Palladium and High Street Phoenix",
      "The mill chimneys still standing between the towers",
      "Late-night dessert and coffee, which this area does better than most",
    ],
  },
  {
    id: "worli",
    name: "Worli",
    vibe: "sea link views, clubs, sports, premium dining",
    bestFor: ["premium dinner", "fitness", "sea-facing drive"],
    transitAccess: "Cabs, buses, Lower Parel/Prabhadevi nearby",
    priceBand: "premium",
    bestTime: "evening",
    monsoonNote: "Sea-facing routes can slow down in rain; keep buffer time.",
    safetyContext: "Best with planned transport late evening.",
    summary:
      "A sea-facing spine between the Sea Link and Mahalaxmi, holding a fishing village, a planetarium, several of the city's most expensive restaurants and its best free evening walk. Worli Sea Face at dusk costs nothing and beats most paid attractions in Mumbai.",
    gettingThere: [
      "Metro Line 3 to Worli or Acharya Atre Chowk, which is the change that made this area reachable without a car.",
      "Western Line to Lower Parel or Prabhadevi, then a 10-minute auto west.",
      "By car over the Bandra–Worli Sea Link from the northern suburbs.",
    ],
    costPerPerson: { min: 0, max: 5000 },
    costNote:
      "Sea Face and Worli Koliwada cost nothing at all. The restaurants on the other side of the road are among the priciest in the country. Both are legitimate ways to spend an evening here.",
    avoid: [
      "Worli Naka at peak hours. It is the junction everything funnels through.",
      "Trying to walk or stop on the Sea Link. Pedestrians are not permitted and stopping is not allowed.",
      "Late dinners without a booked ride back; autos are scarce here compared with the suburbs.",
    ],
    highlights: [
      "Worli Sea Face promenade at sunset",
      "Worli Koliwada, the fishing village the neighbourhood grew around",
      "Nehru Centre and its planetarium",
      "Haji Ali and Mahalaxmi Temple, a short ride south",
    ],
  },
  {
    id: "dadar",
    name: "Dadar",
    vibe: "markets, central access, Maharashtrian food",
    bestFor: ["shopping", "local food", "commuter-friendly meetups"],
    transitAccess: "Western and Central Line interchange",
    priceBand: "budget",
    bestTime: "morning to early evening",
    monsoonNote: "Crowded markets get messy in rain; use station-adjacent plans.",
    safetyContext: "Very crowded; pick clear meetup points.",
    summary:
      "The middle of Mumbai in every sense: the interchange between the Western and Central lines, the flower market that supplies the city, and the best Maharashtrian food outside someone's home. Dadar is not a place to linger prettily — it is a place to get something done and eat extremely well while doing it.",
    gettingThere: [
      "Dadar is the Western–Central interchange, which makes it reachable from nearly anywhere on the suburban network in one change.",
      "Everything worth visiting is within a fifteen-minute walk of one of the two station exits.",
      "Buses from Sion, Mahim and Worli converge on Dadar TT and Plaza.",
    ],
    costPerPerson: { min: 100, max: 700 },
    costNote:
      "A misal pav breakfast, a walk through the flower market and lunch at a Maharashtrian canteen fits comfortably at the low end. There is very little here that costs a lot.",
    avoid: [
      "Dadar station between 8am and 10am, or 6pm and 8:30pm, unless you have no choice.",
      "The flower market after about 9am. It is a dawn market and by mid-morning it is over.",
      "Carrying anything bulky through Dadar Kabutarkhana on a weekend.",
    ],
    highlights: [
      "Dadar Phool Galli flower market, best between 5am and 8am",
      "Shivaji Park and the cricket that never stops there",
      "Aaswad and Prakash for misal, puran poli and piyush",
      "Dadar Market for saris, steel and everything else",
    ],
  },
  {
    id: "powai",
    name: "Powai",
    vibe: "lake, cafes, tech crowd, calmer evenings",
    bestFor: ["work cafes", "date night", "walks"],
    transitAccess: "Metro/rail plus auto or cab",
    priceBand: "mid",
    bestTime: "evening",
    monsoonNote: "Lake views are great after rain; road traffic can spike.",
    safetyContext: "Good main-road activity; avoid isolated lake stretches late.",
    summary:
      "A planned enclave around a lake, with IIT Bombay on one shore and a dense cluster of offices and cafes on the other. Powai is the calmest evening in the eastern suburbs and the easiest place in Mumbai to sit with a laptop for three hours without anyone minding.",
    gettingThere: [
      "Central Line to Kanjurmarg or Vikhroli, then a 10–15 minute auto up to Hiranandani.",
      "Metro Line 6 along the Jogeshwari–Vikhroli Link Road is the direct connection as it opens in stages.",
      "From the airport, about 30 minutes by road via the JVLR.",
    ],
    costPerPerson: { min: 200, max: 1800 },
    costNote:
      "Cafe work sessions and a lake walk are cheap. Hiranandani Galleria restaurants sit in the middle. It is a mid-range neighbourhood with few extremes in either direction.",
    avoid: [
      "The Jogeshwari–Vikhroli Link Road at rush hour, which undoes the whole point of coming here to relax.",
      "The lake edge late at night on the quieter stretches away from Hiranandani.",
      "Expecting to enter IIT Bombay freely — the campus is not open to casual visitors.",
    ],
    highlights: [
      "Powai Lake promenade and the view toward the hills",
      "Hiranandani Gardens and the Galleria cafes",
      "Kanjurmarg-side wetlands, good for early-morning birds",
      "The stretch of cafes that stay open late for the tech crowd",
    ],
  },
  {
    id: "borivali",
    name: "Borivali",
    vibe: "national park, family plans, suburban food",
    bestFor: ["family day", "nature", "budget food"],
    transitAccess: "Western Line, metro extensions, autos",
    priceBand: "budget",
    bestTime: "morning and weekends",
    monsoonNote: "Great for green plans after rain, but check trail conditions.",
    safetyContext: "Stick to marked routes inside park areas.",
    summary:
      "The only major city in the world with a national park inside its limits, and this is where you enter it. Sanjay Gandhi National Park is 87 square kilometres of forest at the end of a Western Line ride, with 2,000-year-old Buddhist caves in the middle of it.",
    gettingThere: [
      "Western Line to Borivali, then a 10-minute auto to the park's main gate at Borivali East.",
      "Metro Line 7 along the Western Express Highway serves the eastern side.",
      "Kanheri Caves are 6 km inside the park — take the park bus or cycle rather than walking it.",
    ],
    costPerPerson: { min: 100, max: 800 },
    costNote:
      "Park entry, the Kanheri ticket and the internal bus are all modest. Food is suburban-priced, which is to say inexpensive and good.",
    avoid: [
      "Arriving after about 3pm. Last entry and the Kanheri timings will cut the visit short.",
      "Kanheri during heavy monsoon rain — the rock steps get genuinely slippery.",
      "Weekends if you want quiet. The park is the whole northern suburbs' Sunday plan.",
    ],
    highlights: [
      "Sanjay Gandhi National Park and its forest trails",
      "Kanheri Caves, carved between the 1st and 10th centuries",
      "Global Vipassana Pagoda at Gorai, reached by a short ferry",
      "Borivali's food streets around the station for the trip back",
    ],
  },
  {
    id: "ghatkopar",
    name: "Ghatkopar",
    vibe: "khau galli, metro-local interchange, veg food",
    bestFor: ["food crawl by train", "budget eats", "quick meetups"],
    transitAccess: "Central Line and Metro Line 1",
    priceBand: "budget",
    bestTime: "evening snack hours",
    monsoonNote: "Station-linked plans work better in heavy rain.",
    safetyContext: "Busy food lanes; keep valuables close.",
    summary:
      "The best vegetarian street-food crawl in Mumbai, arranged conveniently along one road next to a station that connects both the Central Line and Metro Line 1. Ghatkopar's khau galli runs on Gujarati and Jain cooking, and it is at its best after dark.",
    gettingThere: [
      "Central Line to Ghatkopar, which is also the Metro Line 1 terminus for Andheri and Versova.",
      "The khau galli on Jawahar Road is a five-minute walk from the station's west exit.",
      "Metro Line 1 from Andheri takes about 20 minutes and skips the Andheri–Kurla Road entirely.",
    ],
    costPerPerson: { min: 80, max: 500 },
    costNote:
      "A full crawl across six or seven stalls costs less than a single main course in Lower Parel. This is the cheapest genuinely great evening in the city.",
    avoid: [
      "Looking for non-vegetarian food. The khau galli is almost entirely vegetarian and much of it is Jain.",
      "The station interchange at peak — the metro-to-local transfer is a slow crowd.",
      "Arriving before 6pm. Most of the stalls are an evening operation.",
    ],
    highlights: [
      "Ghatkopar Khau Galli on Jawahar Road",
      "Asalpha, the painted hillside, one station away",
      "R City Mall for an air-conditioned break",
      "The Metro Line 1 ride itself, which is elevated the whole way",
    ],
  },
  {
    id: "navi-mumbai",
    name: "Navi Mumbai",
    vibe: "wide roads, malls, waterfronts, family spaces",
    bestFor: ["family day", "drives", "less crowded plans"],
    transitAccess: "Harbour Line, buses, cabs",
    priceBand: "mid",
    bestTime: "late afternoon and evening",
    monsoonNote: "Waterfronts are beautiful post-rain; check wind and tides.",
    safetyContext: "Plan return transport for late-night trips.",
    summary:
      "A planned city across the harbour with the space Mumbai does not have: wide roads, real pavements, parks that are actually park-sized, and a waterfront drive along Palm Beach Road. Flamingos arrive in the creek wetlands every winter.",
    gettingThere: [
      "Harbour Line to Vashi, Belapur or Panvel — the spine of the whole area.",
      "By car over the Atal Setu from South Mumbai, which cuts the trip to roughly twenty minutes.",
      "The Sion–Panvel Highway from the eastern suburbs.",
    ],
    costPerPerson: { min: 150, max: 1500 },
    costNote:
      "Parks, promenades and the flamingo viewing points are free or nearly so. Malls and restaurants sit in the middle of the range.",
    avoid: [
      "Treating it as one neighbourhood. Vashi to Panvel is more than 30 km and the nodes are quite different.",
      "A late-night return without booked transport; autos thin out and the trains stop.",
      "The flamingo wetlands outside roughly November to March — the birds are simply not there.",
    ],
    highlights: [
      "Palm Beach Road, and the creek beside it",
      "Central Park, Kharghar — one of the largest parks in the country",
      "Flamingo season on the Thane Creek wetlands",
      "Pandavkada Falls and the Kharghar hills after monsoon rain",
    ],
  },
];

export const MUMBAI_LAUNCH_PROMPTS: LaunchPrompt[] = [
  { id: "evening-bandra", label: "Evening near Bandra", prompt: "Plan my evening near Bandra with food, a walk, and easy transport.", icon: "sunset" },
  { id: "under-1000", label: "Under Rs 1000", prompt: "What can I do in Mumbai today under Rs 1000?", icon: "wallet" },
  { id: "rain-safe", label: "Rain-safe weekend", prompt: "Give me rain-safe plans in Mumbai this weekend.", icon: "cloud-rain" },
  { id: "food-train", label: "Food crawl by train", prompt: "Plan a Mumbai food crawl that is easy by local train or metro.", icon: "train" },
  { id: "date-lower-parel", label: "Date night", prompt: "Plan a date night near Lower Parel with dinner and a backup indoor option.", icon: "heart" },
  { id: "family-day", label: "Family day", prompt: "Plan a relaxed family day in Mumbai with low travel stress.", icon: "users" },
];

export const MUMBAI_LAUNCH_CONFIG = {
  defaultCityId: DEFAULT_CITY_ID,
  launchCityId: "mumbai",
  liveCityIds: ["mumbai"],
  enabledTabs: ["explore", "pulse", "cityguide"],
  featuredNeighborhoods: MUMBAI_LAUNCH_ZONES.map((zone) => zone.id),
  promptTemplates: MUMBAI_LAUNCH_PROMPTS,
};

export function isLaunchCity(cityNameOrId: string | null | undefined) {
  if (!cityNameOrId) return false;
  const normalized = cityNameOrId.toLowerCase().replace(/\s+/g, "-");
  return normalized === "mumbai";
}

export * from "./currency";
export * from "./search-synonyms";
