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
    tagline: "Gateway to South India",
  },
  {
    id: "new-york",
    name: "New York",
    displayName: "New York, USA",
    country: "USA",
    state: "New York",
    lat: 40.7128,
    lng: -74.006,
    status: "demo",
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
    tagline: "Internal demo city",
  },
];

export const MUMBAI_LAUNCH_ZONES: MumbaiLaunchZone[] = [
  { id: "bandra", name: "Bandra", vibe: "food, nightlife, cafes, sea-facing evenings", bestFor: ["date night", "food crawl", "creator spots"], transitAccess: "Bandra station, autos, ride-hailing, Western Line", priceBand: "mixed", bestTime: "evening after 5pm", monsoonNote: "Good for cafes and indoor dinner plans when rain hits.", safetyContext: "Busy and well-lit in main lanes; plan rides late at night." },
  { id: "andheri", name: "Andheri", vibe: "work hubs, cafes, cinema, metro access", bestFor: ["after-work plans", "movies", "metro-friendly meetups"], transitAccess: "Western Line, Metro Line 1, airport corridor", priceBand: "mixed", bestTime: "weekday evenings", monsoonNote: "Metro is the safer bet during heavy road traffic.", safetyContext: "Station areas get crowded; keep plans close to transit." },
  { id: "juhu", name: "Juhu", vibe: "beach, snacks, casual dates, family walks", bestFor: ["family day", "sunset", "street food"], transitAccess: "Vile Parle/Santacruz plus auto or cab", priceBand: "mixed", bestTime: "sunset and early evenings", monsoonNote: "Avoid high-tide beach walks; pick nearby cafes instead.", safetyContext: "Beachfront is busy; stay around active stretches after dark." },
  { id: "colaba", name: "Colaba", vibe: "heritage, cafes, shopping, tourist classics", bestFor: ["visitor day", "heritage walk", "shopping"], transitAccess: "CSMT/Churchgate plus cab or bus", priceBand: "mixed", bestTime: "late morning to evening", monsoonNote: "Good rain-safe museums, cafes, and covered shopping breaks.", safetyContext: "Tourist-heavy; watch bags in crowded lanes." },
  { id: "fort", name: "Fort", vibe: "architecture, offices, museums, old Bombay", bestFor: ["solo exploring", "heritage", "lunch breaks"], transitAccess: "CSMT, Churchgate, buses, taxis", priceBand: "budget", bestTime: "morning and lunch hours", monsoonNote: "Arcades and cafes make it usable during short showers.", safetyContext: "Quiet after office hours in some lanes." },
  { id: "lower-parel", name: "Lower Parel", vibe: "malls, restaurants, offices, nightlife", bestFor: ["date night", "payday plans", "after-work dinner"], transitAccess: "Lower Parel/Prabhadevi plus cabs", priceBand: "premium", bestTime: "evenings and weekends", monsoonNote: "Strong indoor fallback zone during heavy rain.", safetyContext: "Plan cab pickup points around busy mall exits." },
  { id: "worli", name: "Worli", vibe: "sea link views, clubs, sports, premium dining", bestFor: ["premium dinner", "fitness", "sea-facing drive"], transitAccess: "Cabs, buses, Lower Parel/Prabhadevi nearby", priceBand: "premium", bestTime: "evening", monsoonNote: "Sea-facing routes can slow down in rain; keep buffer time.", safetyContext: "Best with planned transport late evening." },
  { id: "dadar", name: "Dadar", vibe: "markets, central access, Maharashtrian food", bestFor: ["shopping", "local food", "commuter-friendly meetups"], transitAccess: "Western and Central Line interchange", priceBand: "budget", bestTime: "morning to early evening", monsoonNote: "Crowded markets get messy in rain; use station-adjacent plans.", safetyContext: "Very crowded; pick clear meetup points." },
  { id: "powai", name: "Powai", vibe: "lake, cafes, tech crowd, calmer evenings", bestFor: ["work cafes", "date night", "walks"], transitAccess: "Metro/rail plus auto or cab", priceBand: "mid", bestTime: "evening", monsoonNote: "Lake views are great after rain; road traffic can spike.", safetyContext: "Good main-road activity; avoid isolated lake stretches late." },
  { id: "borivali", name: "Borivali", vibe: "national park, family plans, suburban food", bestFor: ["family day", "nature", "budget food"], transitAccess: "Western Line, metro extensions, autos", priceBand: "budget", bestTime: "morning and weekends", monsoonNote: "Great for green plans after rain, but check trail conditions.", safetyContext: "Stick to marked routes inside park areas." },
  { id: "ghatkopar", name: "Ghatkopar", vibe: "khau galli, metro-local interchange, veg food", bestFor: ["food crawl by train", "budget eats", "quick meetups"], transitAccess: "Central Line and Metro Line 1", priceBand: "budget", bestTime: "evening snack hours", monsoonNote: "Station-linked plans work better in heavy rain.", safetyContext: "Busy food lanes; keep valuables close." },
  { id: "navi-mumbai", name: "Navi Mumbai", vibe: "wide roads, malls, waterfronts, family spaces", bestFor: ["family day", "drives", "less crowded plans"], transitAccess: "Harbour Line, buses, cabs", priceBand: "mid", bestTime: "late afternoon and evening", monsoonNote: "Waterfronts are beautiful post-rain; check wind and tides.", safetyContext: "Plan return transport for late-night trips." },
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

export * from "./search-synonyms";
