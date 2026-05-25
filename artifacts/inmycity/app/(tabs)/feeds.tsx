import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetEvents, useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EventCard } from "@/components/EventCard";
import { DealCard } from "@/components/DealCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AiChatFab } from "@/components/AiChatFab";

type MainTab = "pulse" | "news" | "community" | "qa";
type PosterTier = "official" | "local_expert" | "creator" | "business";
type PulseFilter = "all" | "videos" | "food" | "transit" | "tips" | "events";

type NewsCategory = "local" | "traffic" | "weather" | "civic" | "sports" | "business" | "transit";

type NewsSourceKind = "publisher" | "government" | "traffic" | "weather" | "sports" | "business";

interface PulsePost {
  id: number;
  tier: PosterTier;
  author: string;
  handle: string;
  location: string;
  caption: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  videoDuration?: string;
  neighborhood?: string;
  filterTags: PulseFilter[];
  minutesAgo: number;
  likes: number;
  comments: number;
  saves: number;
  isSponsored?: boolean;
  isFeatured?: boolean;
}

interface HappeningItem {
  id: number;
  icon: string;
  color: string;
  text: string;
  minutesAgo: number;
}

interface NewsItem {
  id: number;
  category: NewsCategory;
  headline: string;
  summary: string;
  imageUrl: string;
  source: string;
  sourceKind: NewsSourceKind;
  minutesAgo: number;
  city?: string;
}

interface Community {
  id: number;
  name: string;
  description: string;
  icon: string;
  members: number;
  activity: string;
  tags: string[];
}

interface QAItem {
  id: number;
  question: string;
  author: string;
  initials: string;
  tags: string[];
  upvotes: number;
  answers: number;
  minutesAgo: number;
}

const TIER_CONFIG: Record<PosterTier, { label: string; color: string; bg: string; icon: string }> = {
  official: { label: "Official", color: "#f59e0b", bg: "#fef3c7", icon: "shield" },
  local_expert: { label: "Local Expert", color: "#3b82f6", bg: "#eff6ff", icon: "award" },
  creator: { label: "Creator", color: "#8b5cf6", bg: "#f5f3ff", icon: "video" },
  business: { label: "Business", color: "#10b981", bg: "#f0fdf4", icon: "briefcase" },
};

const NEWS_CATEGORY_META: Record<
  NewsCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  local: { label: "Local", icon: "map-pin", color: "#8b5cf6", bg: "#f5f3ff" },
  traffic: { label: "Traffic", icon: "alert-triangle", color: "#f97316", bg: "#fff7ed" },
  weather: { label: "Weather", icon: "cloud-rain", color: "#3b82f6", bg: "#eff6ff" },
  civic: { label: "Civic", icon: "info", color: "#22c55e", bg: "#f0fdf4" },
  sports: { label: "Sports", icon: "activity", color: "#16a34a", bg: "#f0fdf4" },
  business: { label: "Business", icon: "briefcase", color: "#10b981", bg: "#ecfdf5" },
  transit: { label: "Transit", icon: "navigation", color: "#06b6d4", bg: "#ecfeff" },
};

const HAPPENING_NOW: Record<string, HappeningItem[]> = {
  Mumbai: [
    { id: 1, icon: "alert-triangle", color: "#f97316", text: "Heavy traffic on WEH near Borivali — 45 min delay", minutesAgo: 8 },
    { id: 2, icon: "cloud-rain", color: "#3b82f6", text: "Orange alert: heavy rain expected through midnight", minutesAgo: 20 },
    { id: 3, icon: "zap", color: "#ef4444", text: "Dharavi redevelopment groundbreaking live now", minutesAgo: 3 },
    { id: 4, icon: "navigation", color: "#06b6d4", text: "Central line delayed 15 min — Kurla to Thane", minutesAgo: 31 },
    { id: 5, icon: "activity", color: "#22c55e", text: "MI vs RCB tickets just sold out", minutesAgo: 14 },
  ],
  Bangalore: [
    { id: 1, icon: "navigation", color: "#06b6d4", text: "Metro trial runs on Whitefield extension today", minutesAgo: 5 },
    { id: 2, icon: "alert-triangle", color: "#f97316", text: "Silk Board junction — 30 min peak-hour delays", minutesAgo: 18 },
    { id: 3, icon: "cloud-rain", color: "#3b82f6", text: "Unseasonable rain: Sarjapur Rd waterlogged", minutesAgo: 42 },
    { id: 4, icon: "zap", color: "#ef4444", text: "Bengaluru FC qualifies for ISL semi-finals", minutesAgo: 12 },
    { id: 5, icon: "coffee", color: "#8b5cf6", text: "Third Wave opens a new roastery in Indiranagar", minutesAgo: 55 },
  ],
  "New York City": [
    { id: 1, icon: "navigation", color: "#06b6d4", text: "A, C, E train — no service this weekend on key segments", minutesAgo: 6 },
    { id: 2, icon: "alert-triangle", color: "#f97316", text: "BQE lane closures expected toward Brooklyn Bridge", minutesAgo: 22 },
    { id: 3, icon: "cloud-rain", color: "#3b82f6", text: "Heat advisory through Thursday — 105°F index", minutesAgo: 48 },
    { id: 4, icon: "activity", color: "#22c55e", text: "Knicks just won in OT — city buzzing", minutesAgo: 9 },
    { id: 5, icon: "calendar", color: "#8b5cf6", text: "NYC Marathon closures begin Sunday 5am", minutesAgo: 33 },
  ],
  "San Francisco": [
    { id: 1, icon: "navigation", color: "#06b6d4", text: "BART strike averted — all lines running normally", minutesAgo: 11 },
    { id: 2, icon: "cloud-rain", color: "#3b82f6", text: "Fog at Golden Gate Bridge — visibility ¼ mile", minutesAgo: 25 },
    { id: 3, icon: "zap", color: "#ef4444", text: "PG&E shutoff possible this weekend in fire zones", minutesAgo: 40 },
    { id: 4, icon: "activity", color: "#22c55e", text: "Warriors clinch playoff spot — Chase Center electric", minutesAgo: 17 },
    { id: 5, icon: "coffee", color: "#8b5cf6", text: "Ferry Building farmers market starts 8am tomorrow", minutesAgo: 60 },
  ],
};

const PULSE_POSTS: Record<string, PulsePost[]> = {
  Mumbai: [
    { id: 1, tier: "official", author: "inMyCity Mumbai", handle: "@inmycity.mumbai", location: "Mumbai", caption: "We've verified 40+ new street food stalls around Mohammad Ali Road, Juhu Beach, and Dharavi. The map is now live — every stall is GPS-pinned, rated, and open-hours verified.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80", neighborhood: "City-wide", filterTags: ["all", "food", "tips"], minutesAgo: 15, likes: 3102, comments: 88, saves: 412, isFeatured: true },
    { id: 2, tier: "creator", author: "Riya Desai", handle: "@riyaexplores", location: "Bandra", caption: "4 evenings, 6 benches tested. The bench at coordinates I'm sharing gives the cleanest unobstructed sunset + the chai stall 40 metres north closes at 8:30 sharp — don't be late.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=1200&q=80", videoDuration: "0:47", neighborhood: "Bandra", filterTags: ["all", "videos", "tips"], minutesAgo: 38, likes: 1840, comments: 54, saves: 233 },
    { id: 3, tier: "local_expert", author: "Aarav Mehta", handle: "@aarav.trains", location: "Western Line", caption: "2 years of daily Western Line rides. Leave before 7:55am or after 9:20am. Avoid carriage 3 from the engine. Kandivali ladies compartment exit saves 8 minutes at Churchgate.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1514578915946-8b0a7c3f1f60?auto=format&fit=crop&w=1200&q=80", videoDuration: "1:02", neighborhood: "Western Line", filterTags: ["all", "videos", "transit", "tips"], minutesAgo: 72, likes: 2211, comments: 97, saves: 388 },
    { id: 4, tier: "business", author: "Bohri Kitchen", handle: "@bohrikitchen", location: "Colaba", caption: "Sunday home dining returns. Bohri thaal for 8 guests, ₹1,200 per head, all inclusive. DM to reserve — only 2 seatings left this week.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80", neighborhood: "Colaba", filterTags: ["all", "food", "events"], minutesAgo: 120, likes: 740, comments: 41, saves: 95, isSponsored: true },
    { id: 5, tier: "creator", author: "Mumbai Lens", handle: "@mumbailens", location: "Dharavi", caption: "14 workshops, 3 schools, 1 cricket ground. Dharavi isn't what outsiders imagine. Shot over 6 visits across different times of day.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80", videoDuration: "0:58", neighborhood: "Dharavi", filterTags: ["all", "videos", "tips"], minutesAgo: 190, likes: 4120, comments: 203, saves: 688 },
  ],
  Bangalore: [
    { id: 1, tier: "official", author: "inMyCity Bangalore", handle: "@inmycity.blr", location: "Bangalore", caption: "Namma Metro Phase 2 opens next month — 12 new stations, Whitefield to MG Road in 35 minutes. We've mapped every new interchange, exit, and first/last mile connection.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80", neighborhood: "City-wide", filterTags: ["all", "transit", "tips"], minutesAgo: 22, likes: 2840, comments: 112, saves: 540, isFeatured: true },
    { id: 2, tier: "creator", author: "Sneha Vishwanath", handle: "@snehavblr", location: "Indiranagar", caption: "Matteo → Hao → Araku → Third Wave roastery. 4 stops, 2 hours, 1 excellent afternoon. Exact timings, seat recommendations, and what to order at each.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80", videoDuration: "0:53", neighborhood: "Indiranagar", filterTags: ["all", "videos", "food", "tips"], minutesAgo: 55, likes: 1320, comments: 48, saves: 177 },
    { id: 3, tier: "local_expert", author: "Karthik Rajan", handle: "@kartik.blr", location: "HSR Layout", caption: "Tracked 22 problem road stretches since October. Here's which roads flood first in rain, and which alternate routes hold up — with actual travel times tested.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80", neighborhood: "HSR Layout", filterTags: ["all", "transit", "tips"], minutesAgo: 130, likes: 980, comments: 67, saves: 144 },
  ],
  "New York City": [
    { id: 1, tier: "official", author: "inMyCity NYC", handle: "@inmycity.nyc", location: "New York City", caption: "A, C, E line changes this weekend — we mapped every shuttle bus, walking route, and timing so you don't show up to a closed station.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80", neighborhood: "City-wide", filterTags: ["all", "transit", "tips"], minutesAgo: 10, likes: 2430, comments: 76, saves: 304, isFeatured: true },
    { id: 2, tier: "creator", author: "Maya Romano", handle: "@mayaroamanyc", location: "Brooklyn", caption: "Start DUMBO side at 6:30pm. Walk to Manhattan. Slice at Prince St Pizza on the way back. 90 minutes, zero tourist traps, best city view you'll get for free.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1499092346302-fde68f2ccc83?auto=format&fit=crop&w=1200&q=80", videoDuration: "0:44", neighborhood: "Brooklyn", filterTags: ["all", "videos", "tips"], minutesAgo: 28, likes: 3120, comments: 89, saves: 511 },
    { id: 3, tier: "local_expert", author: "Jake Sullivan", handle: "@jakenyc.local", location: "Queens", caption: "31 bagel shops across all 5 boroughs, ranked by crust, chew, cream cheese ratio, and wait time. The results will genuinely surprise you — it's not who you think.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80", neighborhood: "Multi-borough", filterTags: ["all", "food", "tips"], minutesAgo: 95, likes: 4880, comments: 234, saves: 722 },
    { id: 4, tier: "business", author: "Levain Bakery", handle: "@levainbakery", location: "Upper West Side", caption: "New walnut chocolate chip cookie launched yesterday across all 5 locations. 8 months in development. All stores have it now — the line at 72nd has been worth it.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=80", neighborhood: "Upper West Side", filterTags: ["all", "food"], minutesAgo: 160, likes: 2150, comments: 88, saves: 340, isSponsored: true },
  ],
  "San Francisco": [
    { id: 1, tier: "official", author: "inMyCity SF", handle: "@inmycity.sf", location: "San Francisco", caption: "3 months of fog data, broken down by month, time of day, and camera angle. The bridge is clear 73% of mornings before 9am in September. Here's your go/no-go calendar.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80", neighborhood: "Presidio", filterTags: ["all", "tips"], minutesAgo: 20, likes: 1890, comments: 63, saves: 287, isFeatured: true },
    { id: 2, tier: "creator", author: "Sofia Lin", handle: "@sofiasf.creates", location: "Mission District", caption: "47 blocks. 6 Saturdays. These are the 12 murals that don't show up on tourist lists — the ones the Mission actually cares about.", mediaType: "video", mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80", videoDuration: "0:56", neighborhood: "Mission", filterTags: ["all", "videos", "tips"], minutesAgo: 75, likes: 2340, comments: 102, saves: 418 },
    { id: 3, tier: "local_expert", author: "Tom Hargreaves", handle: "@tomharg.sf", location: "BART", caption: "2 years of late-night BART rides, documented honestly. Which exits to use, which cars to board, what the real safety picture looks like by line and station.", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80", neighborhood: "City-wide", filterTags: ["all", "transit", "tips"], minutesAgo: 145, likes: 3210, comments: 178, saves: 566 },
  ],
};

const NEWS_DATA: Record<string, NewsItem[]> = {
  Mumbai: [
    { id: 1, category: "traffic", headline: "Western Express Highway hit by major peak-hour delays", summary: "Traffic police advise using JVLR and alternate routes until 8:30 pm.", imageUrl: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80", source: "Mumbai Traffic Police", sourceKind: "traffic", minutesAgo: 12, city: "Mumbai" },
    { id: 2, category: "weather", headline: "Orange alert issued for Mumbai as heavy rain returns", summary: "IMD expects intense showers in low-lying areas through midnight.", imageUrl: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80", source: "IMD Mumbai", sourceKind: "weather", minutesAgo: 22, city: "Mumbai" },
    { id: 3, category: "civic", headline: "BMC announces water cut in Andheri and Bandra today", summary: "Supply will remain off from 10am to 6pm for pipeline maintenance.", imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80", source: "BMC", sourceKind: "government", minutesAgo: 45, city: "Mumbai" },
    { id: 4, category: "local", headline: "Dharavi redevelopment project breaks ground officially", summary: "Maharashtra CM inaugurated the ₹20,000 Cr project this morning.", imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80", source: "Hindustan Times", sourceKind: "publisher", minutesAgo: 60, city: "Mumbai" },
    { id: 5, category: "sports", headline: "Mumbai Indians sell out Wankhede for RCB clash", summary: "All 33,000 tickets sold within 90 minutes of release.", imageUrl: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80", source: "Times of India Sport", sourceKind: "publisher", minutesAgo: 90, city: "Mumbai" },
    { id: 6, category: "local", headline: "New verified food stalls added around Mohammad Ali Road", summary: "City guide team expanded the street food map with 40+ vetted stalls.", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80", source: "inMyCity Mumbai", sourceKind: "publisher", minutesAgo: 110, city: "Mumbai" },
  ],
  Bangalore: [
    { id: 1, category: "civic", headline: "Namma Metro Phase 2 Whitefield extension opens next month", summary: "The 13.71 km stretch adds 12 stations and cuts Whitefield to MG Road to 35 minutes.", imageUrl: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=1200&q=80", source: "BMRCL", sourceKind: "government", minutesAgo: 20, city: "Bangalore" },
    { id: 2, category: "traffic", headline: "Silk Board junction signal upgrade is causing serious delays", summary: "Electronic signal replacement underway. Expect 30 minute peak-hour slowdowns.", imageUrl: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80", source: "BBMP Traffic", sourceKind: "traffic", minutesAgo: 38, city: "Bangalore" },
    { id: 3, category: "weather", headline: "Bengaluru receives unseasonal heavy showers", summary: "Outer Ring Road and Sarjapur Road have waterlogging this evening.", imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=80", source: "IMD Bengaluru", sourceKind: "weather", minutesAgo: 58, city: "Bangalore" },
    { id: 4, category: "local", headline: "Third Wave Coffee opens new roastery in Indiranagar", summary: "The new space includes a tasting bar and weekend cupping sessions.", imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80", source: "Deccan Herald", sourceKind: "publisher", minutesAgo: 75, city: "Bangalore" },
    { id: 5, category: "sports", headline: "Bengaluru FC qualifies for ISL semi-finals with comeback win", summary: "A late goal at Kanteerava sealed a 2–1 victory.", imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80", source: "Deccan Herald Sport", sourceKind: "publisher", minutesAgo: 104, city: "Bangalore" },
    { id: 6, category: "local", headline: "BBMP pothole repair drive begins in HSR and Koramangala", summary: "Ward teams deployed with a two-week target to fix 2,000 potholes.", imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80", source: "inMyCity Bangalore", sourceKind: "publisher", minutesAgo: 130, city: "Bangalore" },
  ],
  "New York City": [
    { id: 1, category: "traffic", headline: "BQE lane closures expected toward Brooklyn Bridge", summary: "Two lanes are closed for emergency deck repair through late evening.", imageUrl: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=80", source: "NYSDOT", sourceKind: "traffic", minutesAgo: 8, city: "New York City" },
    { id: 2, category: "transit", headline: "MTA weekend subway service changes hit A, C, E lines", summary: "No A train service between Howard Beach and Far Rockaway Sat–Sun.", imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80", source: "MTA", sourceKind: "government", minutesAgo: 18, city: "New York City" },
    { id: 3, category: "weather", headline: "NYC Heat Advisory in effect through Thursday", summary: "Heat index values may reach 105°F. Cooling centers are open citywide.", imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", source: "NWS New York", sourceKind: "weather", minutesAgo: 30, city: "New York City" },
    { id: 4, category: "local", headline: "Times Square pedestrian redesign unveiled", summary: "Protected lanes and wider sidewalks approved by City Council.", imageUrl: "https://images.unsplash.com/photo-1546436836-07a91091f160?auto=format&fit=crop&w=1200&q=80", source: "NYC DOT", sourceKind: "government", minutesAgo: 52, city: "New York City" },
    { id: 5, category: "sports", headline: "Knicks defeat Celtics in overtime thriller at MSG", summary: "Jalen Brunson dropped 42 points in a dramatic comeback.", imageUrl: "https://images.unsplash.com/photo-1518061214050-e6025e3e9b4f?auto=format&fit=crop&w=1200&q=80", source: "NY Post Sports", sourceKind: "publisher", minutesAgo: 77, city: "New York City" },
    { id: 6, category: "business", headline: "Levain launches a new walnut chocolate chip cookie", summary: "All five locations now have the new item after an eight-month test.", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=80", source: "Levain Bakery", sourceKind: "business", minutesAgo: 120, city: "New York City" },
  ],
  "San Francisco": [
    { id: 1, category: "transit", headline: "BART strike averted — service continues as normal", summary: "Union and BART management reached a tentative agreement.", imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", source: "BART", sourceKind: "government", minutesAgo: 11, city: "San Francisco" },
    { id: 2, category: "weather", headline: "Dense fog advisory for Golden Gate Bridge until noon", summary: "Visibility is under a quarter mile and the speed limit is reduced.", imageUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80", source: "NWS Bay Area", sourceKind: "weather", minutesAgo: 25, city: "San Francisco" },
    { id: 3, category: "local", headline: "SF expands overnight shelter capacity by 300 beds", summary: "A new Navigation Center opens in SOMA as part of the winter plan.", imageUrl: "https://images.unsplash.com/photo-1516298584913-7e33b5f05f44?auto=format&fit=crop&w=1200&q=80", source: "SF Chronicle", sourceKind: "publisher", minutesAgo: 39, city: "San Francisco" },
    { id: 4, category: "traffic", headline: "Bay Bridge westbound lane closure begins Friday evening", summary: "One lane will be closed from 8 pm to 5 am for sensor installation.", imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80", source: "Bay Bridge", sourceKind: "traffic", minutesAgo: 62, city: "San Francisco" },
    { id: 5, category: "sports", headline: "Warriors clinch playoff spot with dominant win over Lakers", summary: "Steph Curry's 38-point performance sealed the top-4 seeding.", imageUrl: "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80", source: "SF Chronicle Sport", sourceKind: "publisher", minutesAgo: 84, city: "San Francisco" },
    { id: 6, category: "business", headline: "Ferry Building farmers market opens early tomorrow", summary: "Fresh produce, local vendors, and live music from 8 am.", imageUrl: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80", source: "inMyCity SF", sourceKind: "publisher", minutesAgo: 115, city: "San Francisco" },
  ],
};

const DEFAULT_NEWS: NewsItem[] = [
  { id: 1, category: "local", headline: "Select a city to see local news and alerts.", summary: "Use the city picker to view news relevant to your area.", imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80", source: "inMyCity", sourceKind: "publisher", minutesAgo: 0 },
];

const COMMUNITY_DATA: Record<string, Community[]> = {
  Mumbai: [
    { id: 1, name: "Mumbai Foodies", description: "Best street eats, restaurant reviews, and hidden gems across the city.", icon: "coffee", members: 42800, activity: "120 posts today", tags: ["Food", "Restaurants", "Street Food"] },
    { id: 2, name: "Mumbai Local Train Riders", description: "Tips, route hacks, and daily updates for local train commuters.", icon: "share-2", members: 31500, activity: "88 posts today", tags: ["Transit", "Commute", "Western", "Central"] },
    { id: 3, name: "Bandra Residents", description: "Hyperlocal updates, events, and community issues for Bandra folks.", icon: "home", members: 9200, activity: "24 posts today", tags: ["Bandra", "Local", "Events"] },
    { id: 4, name: "Mumbai Cricket Fans", description: "Live match discussions, Wankhede events, and cricket banter.", icon: "activity", members: 56000, activity: "310 posts today", tags: ["Cricket", "Sports", "IPL"] },
    { id: 5, name: "Mumbai Runners Club", description: "Weekend running groups along Marine Drive, Bandra Bandstand, and Powai Lake.", icon: "activity", members: 14200, activity: "45 posts today", tags: ["Running", "Fitness", "Marathon"] },
  ],
  Bangalore: [
    { id: 1, name: "Namma Bengaluru Foodies", description: "From MTR to microbreweries — all things food in Bangalore.", icon: "coffee", members: 38200, activity: "95 posts today", tags: ["Food", "Restaurants", "Cafes"] },
    { id: 2, name: "Bangalore Tech Community", description: "Meetups, job postings, and startup news for Bangalore's tech scene.", icon: "code", members: 67400, activity: "210 posts today", tags: ["Tech", "Startups", "Jobs"] },
    { id: 3, name: "Koramangala Connect", description: "Residents and businesses of Koramangala sharing local updates.", icon: "home", members: 12100, activity: "41 posts today", tags: ["Koramangala", "Local", "Housing"] },
    { id: 4, name: "BLR Cyclists", description: "Weekend rides, routes, and cycling advocacy across Bangalore.", icon: "wind", members: 8700, activity: "18 posts today", tags: ["Cycling", "Fitness", "Outdoors"] },
    { id: 5, name: "Bangalore Fitness Tribe", description: "CrossFit, calisthenics, and gym reviews across Bangalore.", icon: "activity", members: 11800, activity: "32 posts today", tags: ["Fitness", "Gym", "CrossFit"] },
  ],
  "New York City": [
    { id: 1, name: "NYC Food Scene", description: "Restaurant discoveries, chef news, and the best pizza debates.", icon: "coffee", members: 89600, activity: "450 posts today", tags: ["Food", "Restaurants", "Pizza", "Brunch"] },
    { id: 2, name: "Brooklyn Residents", description: "Community news, events, and neighbourhood updates for Brooklyn.", icon: "home", members: 43000, activity: "130 posts today", tags: ["Brooklyn", "Local", "Events"] },
    { id: 3, name: "NYC Photography Club", description: "Share your city shots, join photo walks, and get feedback.", icon: "aperture", members: 22300, activity: "76 posts today", tags: ["Photography", "Art", "Creative"] },
    { id: 4, name: "Commuter Warriors NYC", description: "Subway hacks, MTA complaints, and commuter solidarity.", icon: "share-2", members: 31800, activity: "195 posts today", tags: ["Transit", "MTA", "Subway"] },
    { id: 5, name: "NYC Runners", description: "Central Park loop runs, marathon training, and the city's best routes.", icon: "activity", members: 38600, activity: "150 posts today", tags: ["Running", "Marathon", "NYRR"] },
  ],
  "San Francisco": [
    { id: 1, name: "SF Bay Foodies", description: "Farm-to-table finds, Mission burritos, and Michelin guides.", icon: "coffee", members: 34500, activity: "110 posts today", tags: ["Food", "Restaurants", "Mission"] },
    { id: 2, name: "Mission District Community", description: "Hyperlocal issues, murals, events and housing news.", icon: "home", members: 11200, activity: "38 posts today", tags: ["Mission", "Local", "Housing"] },
    { id: 3, name: "SF Tech Founders", description: "Startup stories, investor intros, and SoMa office chatter.", icon: "code", members: 48900, activity: "220 posts today", tags: ["Tech", "Startups", "VC"] },
    { id: 4, name: "Golden Gate Cyclists", description: "Bridge crossings, Marin trails, and bike commute tips.", icon: "wind", members: 9600, activity: "29 posts today", tags: ["Cycling", "Outdoors", "GGBP"] },
    { id: 5, name: "Bay Area Fitness Community", description: "CrossFit, trail running, open water swimming, and Bay Area sports events.", icon: "activity", members: 16400, activity: "52 posts today", tags: ["Fitness", "Trail Running", "CrossFit"] },
  ],
};

const QA_DATA: Record<string, QAItem[]> = {
  Mumbai: [
    { id: 1, question: "Best time to travel on the Western Line to avoid rush hour?", author: "Rahul M.", initials: "RM", tags: ["Transit", "Western Line"], upvotes: 128, answers: 14, minutesAgo: 30 },
    { id: 2, question: "Which areas have the best street food near Marine Drive?", author: "Priya K.", initials: "PK", tags: ["Food", "Marine Drive"], upvotes: 94, answers: 22, minutesAgo: 90 },
    { id: 3, question: "How do I apply for an emergency water connection via BMC?", author: "Sanjay D.", initials: "SD", tags: ["Civic", "BMC"], upvotes: 47, answers: 8, minutesAgo: 200 },
    { id: 4, question: "Is there parking near Bandra Kurla Complex on weekends?", author: "Aisha T.", initials: "AT", tags: ["Parking", "BKC"], upvotes: 63, answers: 11, minutesAgo: 310 },
    { id: 5, question: "Best affordable gyms in Bandra or Andheri with no annual lock-in?", author: "Rohan S.", initials: "RS", tags: ["Fitness", "Gym"], upvotes: 84, answers: 16, minutesAgo: 75 },
  ],
  Bangalore: [
    { id: 1, question: "Which Namma Metro stations have reliable bike parking?", author: "Karthik R.", initials: "KR", tags: ["Metro", "Parking", "Cycling"], upvotes: 112, answers: 17, minutesAgo: 20 },
    { id: 2, question: "Best co-working spaces near Indiranagar with good wifi?", author: "Sneha V.", initials: "SV", tags: ["Work", "Indiranagar"], upvotes: 87, answers: 19, minutesAgo: 80 },
    { id: 3, question: "How to navigate BBMP property tax payment issues online?", author: "Mohan P.", initials: "MP", tags: ["Civic", "BBMP"], upvotes: 55, answers: 9, minutesAgo: 180 },
    { id: 4, question: "Auto-rickshaw refusing meter — what are my options?", author: "Divya L.", initials: "DL", tags: ["Transit", "Auto"], upvotes: 201, answers: 31, minutesAgo: 260 },
    { id: 5, question: "How do I book badminton courts at Kanteerava Stadium online?", author: "Preethi M.", initials: "PM", tags: ["Sports", "Badminton"], upvotes: 67, answers: 11, minutesAgo: 110 },
  ],
  "New York City": [
    { id: 1, question: "Fastest subway route from JFK to Midtown on a Sunday?", author: "Jake S.", initials: "JS", tags: ["Transit", "Subway", "JFK"], upvotes: 156, answers: 24, minutesAgo: 15 },
    { id: 2, question: "Are Citi Bikes worth it for daily commuting in Brooklyn?", author: "Maya L.", initials: "ML", tags: ["Cycling", "Citi Bike"], upvotes: 88, answers: 16, minutesAgo: 75 },
    { id: 3, question: "Best bagel spots open before 7am in Lower Manhattan?", author: "Dave R.", initials: "DR", tags: ["Food", "Bagels"], upvotes: 213, answers: 38, minutesAgo: 130 },
    { id: 4, question: "How does alternate-side parking work for alternate days?", author: "Kim W.", initials: "KW", tags: ["Parking", "Civic"], upvotes: 72, answers: 14, minutesAgo: 290 },
    { id: 5, question: "Best outdoor running routes in Brooklyn safe early morning?", author: "Sarah M.", initials: "SM", tags: ["Running", "Brooklyn"], upvotes: 118, answers: 21, minutesAgo: 55 },
  ],
  "San Francisco": [
    { id: 1, question: "Is BART safe to take late at night to Oakland?", author: "Tom H.", initials: "TH", tags: ["BART", "Safety"], upvotes: 142, answers: 29, minutesAgo: 25 },
    { id: 2, question: "Best neighborhoods for young professionals moving to SF?", author: "Ava C.", initials: "AC", tags: ["Housing", "Neighborhoods"], upvotes: 198, answers: 43, minutesAgo: 60 },
    { id: 3, question: "How does the SF residential parking permit system work?", author: "Leo B.", initials: "LB", tags: ["Parking", "Permit"], upvotes: 67, answers: 12, minutesAgo: 150 },
    { id: 4, question: "What's the deal with the SFMTA Muni app — is it accurate?", author: "Nora F.", initials: "NF", tags: ["Transit", "Muni"], upvotes: 95, answers: 18, minutesAgo: 220 },
    { id: 5, question: "Are Golden Gate Park tennis courts worth booking in advance?", author: "Chris P.", initials: "CP", tags: ["Tennis", "Sports"], upvotes: 76, answers: 13, minutesAgo: 85 },
  ],
};

const NEWS_CATEGORY_ORDER: NewsCategory[] = ["traffic", "weather", "civic", "local", "sports", "business"];

const NEWS_CATEGORY_FILTERS = ["all", ...NEWS_CATEGORY_ORDER] as const;

function timeAgo(min: number) {
  if (min === 0) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

function formatMembers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

const TABS: { id: MainTab; label: string; icon: string }[] = [
  { id: "pulse", label: "Pulse", icon: "zap" },
  { id: "news", label: "News", icon: "bell" },
  { id: "community", label: "Community", icon: "users" },
  { id: "qa", label: "Q&A", icon: "message-circle" },
];

export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState<MainTab>("pulse");
  const [joinedCommunities, setJoinedCommunities] = useState<Set<number>>(new Set());
  const [upvotedQA, setUpvotedQA] = useState<Set<number>>(new Set());
  const [upvoteCounts, setUpvoteCounts] = useState<Record<number, number>>({});
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [saveCounts, setSaveCounts] = useState<Record<number, number>>({});

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPad = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useGetEvents({ city: cityName });
  const { data: deals = [], isLoading: dealsLoading, refetch: refetchDeals } = useGetDeals({ city: cityName });

  const news = (cityName ? NEWS_DATA[cityName] : undefined) ?? DEFAULT_NEWS;
  const communities = (cityName ? COMMUNITY_DATA[cityName] : undefined) ?? [];
  const qaItems = (cityName ? QA_DATA[cityName] : undefined) ?? [];
  const allPulse = (cityName ? PULSE_POSTS[cityName] : undefined) ?? [];
  const happeningNow = (cityName ? HAPPENING_NOW[cityName] : undefined) ?? [];
  const pulseNews = news.slice(0, 3);

  const toggleJoin = (id: number) => setJoinedCommunities((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleUpvote = (id: number, base: number) => setUpvotedQA((prev) => {
    const n = new Set(prev);
    const was = n.has(id);
    was ? n.delete(id) : n.add(id);
    setUpvoteCounts((c) => ({ ...c, [id]: was ? base : base + 1 }));
    return n;
  });

  const toggleLike = (id: number, base: number) => setLikedPosts((prev) => {
    const n = new Set(prev);
    const was = n.has(id);
    was ? n.delete(id) : n.add(id);
    setLikeCounts((c) => ({ ...c, [id]: was ? base : base + 1 }));
    return n;
  });

  const toggleSave = (id: number, base: number) => setSavedPosts((prev) => {
    const n = new Set(prev);
    const was = n.has(id);
    was ? n.delete(id) : n.add(id);
    setSaveCounts((c) => ({ ...c, [id]: was ? base : base + 1 }));
    return n;
  });

  const header = (
    <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}> 
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
          <Text style={[styles.wordmarkSub, { color: colors.mutedForeground }]}>{cityName ? `${cityName} · What's happening` : "Select a city to begin"}</Text>
        </View>
        <View style={[styles.liveChip, { backgroundColor: "#ef444418" }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: "#ef4444" }]}>Live</Text>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => setActiveTab(tab.id)} activeOpacity={0.7}>
              <View style={styles.tabInner}>
                <Feather name={tab.icon as any} size={13} color={active ? colors.amber : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: active ? colors.amber : colors.mutedForeground }]}>{tab.label}</Text>
              </View>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.amber }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderPulseTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
      {happeningNow.length > 0 && (
        <View style={[styles.happeningSection, { borderBottomColor: colors.border }]}>
          <View style={styles.happeningSectionHeader}>
            <View style={styles.happeningLiveDotWrap}>
              <View style={styles.happeningLiveDot} />
            </View>
            <Text style={[styles.happeningSectionLabel, { color: colors.foreground }]}>Happening Now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.happeningScroll}>
            {happeningNow.map((item) => (
              <TouchableOpacity key={item.id} activeOpacity={0.8} style={[styles.happeningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.happeningIconWrap, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon as any} size={13} color={item.color} />
                </View>
                <Text style={[styles.happeningText, { color: colors.foreground }]} numberOfLines={2}>{item.text}</Text>
                <Text style={[styles.happeningTime, { color: colors.mutedForeground }]}>{timeAgo(item.minutesAgo)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {allPulse.length === 0 ? (
        <EmptyState icon="zap" message={cityName ? `No posts for ${cityName} yet.` : "Select a city to see Pulse."} colors={colors} />
      ) : (
        <View style={styles.pulseList}>
          {[...allPulse.slice(0, 2), ...news.slice(0, 3), ...allPulse.slice(2)].map((item, index) => {
            const isNews = "imageUrl" in item && "headline" in item && "source" in item;
            if (isNews) {
              const newsItem = item as typeof news[number];
              const meta = NEWS_CATEGORY_META[newsItem.category];
              return (
                <TouchableOpacity key={`pulse-news-${newsItem.id}`} activeOpacity={0.9} style={[styles.pulseNewsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: newsItem.imageUrl }} style={styles.pulseNewsImage} />
                  <View style={styles.pulseNewsBody}>
                    <View style={styles.pulseNewsTopRow}>
                      <Text style={[styles.pulseNewsSource, { color: colors.foreground }]} numberOfLines={1}>{newsItem.source}</Text>
                      <Text style={[styles.pulseNewsTime, { color: colors.mutedForeground }]}>{timeAgo(newsItem.minutesAgo)}</Text>
                    </View>
                    <View style={styles.pulseNewsTagRow}>
                      <Text style={[styles.pulseNewsTag, { color: meta.color, backgroundColor: meta.bg }]}>{meta.label}</Text>
                      <Text style={[styles.pulseNewsShort, { color: colors.mutedForeground }]} numberOfLines={1}>Trusted publisher update</Text>
                    </View>
                    <Text style={[styles.pulseNewsHeadline, { color: colors.foreground }]} numberOfLines={2}>{newsItem.headline}</Text>
                    <Text style={[styles.pulseNewsSummary, { color: colors.mutedForeground }]} numberOfLines={3}>{newsItem.summary}</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            const post = item as (typeof allPulse)[number];
            const cfg = TIER_CONFIG[post.tier];
            const isLiked = likedPosts.has(post.id);
            const isSaved = savedPosts.has(post.id);
            const likeCount = likeCounts[post.id] ?? post.likes;
            const saveCount = saveCounts[post.id] ?? post.saves;
            const isNew = post.minutesAgo < 30;
            const isHero = post.isFeatured && index === 0;

            return (
              <React.Fragment key={post.id}>
                {index === 2 && (
                  <View style={[styles.trendingInsert, { backgroundColor: colors.muted }]}>
                    <View style={styles.trendingHeader}>
                      <Feather name="trending-up" size={13} color={colors.amber} />
                      <Text style={[styles.trendingLabel, { color: colors.foreground }]}>Trending in {cityName ?? "your city"}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
                      {["#StreetFood", "#Transit", "#Neighbourhood", "#LocalTips", "#Events", "#WeekendVibes"].map((tag) => (
                        <TouchableOpacity key={tag} style={[styles.trendingChip, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
                          <Text style={[styles.trendingChipText, { color: colors.foreground }]}>{tag}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {isHero ? (
                  <TouchableOpacity activeOpacity={0.92} style={styles.heroCard}>
                    <Image source={{ uri: post.mediaUrl }} style={styles.heroImage} resizeMode="cover" />
                    <View style={styles.heroOverlay}>
                      <View style={styles.heroTop}>
                        {post.isSponsored && <View style={styles.heroSponsoredBadge}><Text style={styles.heroSponsoredText}>Sponsored</Text></View>}
                        {isNew && <View style={styles.heroNewBadge}><View style={styles.heroNewDot} /><Text style={styles.heroNewText}>New</Text></View>}
                        {post.mediaType === "video" && <View style={styles.heroVideoBadge}><Feather name="play" size={10} color="#fff" /><Text style={styles.heroVideoText}>{post.videoDuration}</Text></View>}
                      </View>
                      <View style={styles.heroBottom}>
                        {post.neighborhood && <View style={styles.heroLocationRow}><Feather name="map-pin" size={11} color="rgba(255,255,255,0.7)" /><Text style={styles.heroLocation}>{post.neighborhood}</Text></View>}
                        <Text style={styles.heroCaption} numberOfLines={3}>{post.caption}</Text>
                        <View style={styles.heroAuthorRow}><View style={[styles.heroTierDot, { backgroundColor: cfg.color }]} /><Text style={styles.heroAuthor}>{post.author}</Text><Text style={styles.heroMeta}>{post.handle} · {timeAgo(post.minutesAgo)}</Text></View>
                        <View style={styles.heroActions}>
                          <TouchableOpacity style={styles.heroAction} onPress={() => toggleLike(post.id, post.likes)} activeOpacity={0.7}><Feather name="heart" size={16} color={isLiked ? "#ef4444" : "rgba(255,255,255,0.85)"} /><Text style={[styles.heroActionText, { color: isLiked ? "#ef4444" : "rgba(255,255,255,0.85)" }]}>{formatCount(likeCount)}</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.heroAction} activeOpacity={0.7}><Feather name="message-circle" size={16} color="rgba(255,255,255,0.85)" /><Text style={styles.heroActionText}>{formatCount(post.comments)}</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.heroAction} onPress={() => toggleSave(post.id, post.saves)} activeOpacity={0.7}><Feather name="bookmark" size={16} color={isSaved ? colors.amber : "rgba(255,255,255,0.85)"} /><Text style={[styles.heroActionText, { color: isSaved ? colors.amber : "rgba(255,255,255,0.85)" }]}>{formatCount(saveCount)}</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.heroAction, { marginLeft: "auto" }]} activeOpacity={0.7}><Feather name="share-2" size={16} color="rgba(255,255,255,0.85)" /></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity activeOpacity={0.92} style={[styles.pulseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {post.isSponsored && <View style={[styles.sponsoredStrip, { backgroundColor: colors.muted }]}><Feather name="star" size={10} color={colors.mutedForeground} /><Text style={[styles.sponsoredStripText, { color: colors.mutedForeground }]}>Sponsored</Text></View>}
                    <View style={styles.cardAuthorRow}>
                      <View style={[styles.cardAvatar, { backgroundColor: cfg.color + "20" }]}><Text style={[styles.cardAvatarText, { color: cfg.color }]}>{post.author.charAt(0).toUpperCase()}</Text></View>
                      <View style={styles.cardAuthorMeta}>
                        <View style={styles.cardAuthorNameRow}>
                          <Text style={[styles.cardAuthorName, { color: colors.foreground }]}>{post.author}</Text>
                          <View style={[styles.cardTierDot, { backgroundColor: cfg.color }]} />
                          {isNew && <View style={[styles.cardNewBadge, { backgroundColor: "#22c55e18" }]}><View style={[styles.cardNewDot, { backgroundColor: "#22c55e" }]} /><Text style={[styles.cardNewText, { color: "#22c55e" }]}>New</Text></View>}
                        </View>
                        <Text style={[styles.cardMetaLine, { color: colors.mutedForeground }]}>{post.handle}{post.neighborhood ? ` · ${post.neighborhood}` : ""} · {timeAgo(post.minutesAgo)}</Text>
                      </View>
                      <TouchableOpacity style={styles.cardMore} activeOpacity={0.7}><Feather name="more-horizontal" size={18} color={colors.mutedForeground} /></TouchableOpacity>
                    </View>
                    <Text style={[styles.cardCaption, { color: colors.foreground }]} numberOfLines={3}>{post.caption}</Text>
                    <View style={styles.cardMediaWrap}>
                      <Image source={{ uri: post.mediaUrl }} style={styles.cardMedia} resizeMode="cover" />
                      {post.mediaType === "video" && <View style={styles.cardVideoOverlay}><View style={styles.cardPlayBtn}><Feather name="play" size={18} color="#fff" /></View><View style={styles.cardDurationBadge}><Feather name="video" size={9} color="#fff" /><Text style={styles.cardDurationText}>{post.videoDuration}</Text></View></View>}
                    </View>
                    <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                      <TouchableOpacity style={styles.cardAction} onPress={() => toggleLike(post.id, post.likes)} activeOpacity={0.7}><Feather name="heart" size={18} color={isLiked ? "#ef4444" : colors.mutedForeground} /><Text style={[styles.cardActionCount, { color: isLiked ? "#ef4444" : colors.mutedForeground }]}>{formatCount(likeCount)}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.cardAction} activeOpacity={0.7}><Feather name="message-circle" size={18} color={colors.mutedForeground} /><Text style={[styles.cardActionCount, { color: colors.mutedForeground }]}>{formatCount(post.comments)}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.cardAction} onPress={() => toggleSave(post.id, post.saves)} activeOpacity={0.7}><Feather name="bookmark" size={18} color={isSaved ? colors.amber : colors.mutedForeground} /><Text style={[styles.cardActionCount, { color: isSaved ? colors.amber : colors.mutedForeground }]}>{formatCount(saveCount)}</Text></TouchableOpacity>
                      <View style={styles.cardActionSpacer} />
                      <TouchableOpacity style={styles.cardAction} activeOpacity={0.7}><Feather name="share-2" size={18} color={colors.mutedForeground} /></TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderNewsTab = () => {
    const orderedNews = [...news].sort((a, b) => a.minutesAgo - b.minutesAgo);

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <View style={styles.newsList}>
          {orderedNews.map((item) => {
            const meta = NEWS_CATEGORY_META[item.category];
            const isPublisher = item.sourceKind === "publisher";
            return (
              <TouchableOpacity key={item.id} activeOpacity={0.86} style={[styles.publisherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.publisherTop}>
                  <View style={styles.publisherSourceRow}>
                    <View style={[styles.publisherIconWrap, { backgroundColor: meta.bg }]}>
                      <Feather name={meta.icon as any} size={12} color={meta.color} />
                    </View>
                    <View style={styles.publisherMeta}>
                      <Text style={[styles.publisherSource, { color: colors.foreground }]} numberOfLines={1}>{item.source}</Text>
                      <View style={styles.publisherMetaRow}>
                        <Text style={[styles.publisherTime, { color: colors.mutedForeground }]}>{timeAgo(item.minutesAgo)}</Text>
                        {isPublisher ? <Text style={[styles.publisherDot, { color: colors.mutedForeground }]}>·</Text> : null}
                        {isPublisher ? <Text style={[styles.publisherShortLabel, { color: meta.color, backgroundColor: meta.bg }]}>{meta.label}</Text> : null}
                      </View>
                    </View>
                  </View>
                  {!isPublisher ? <Text style={[styles.publisherTag, { color: meta.color, backgroundColor: meta.bg }]}>{meta.label}</Text> : null}
                </View>
                <View style={styles.publisherBody}>
                  <Image source={{ uri: item.imageUrl }} style={styles.publisherImage} />
                  <View style={styles.publisherContent}>
                    <Text style={[styles.publisherHeadline, { color: colors.foreground }]} numberOfLines={2}>{item.headline}</Text>
                    <Text style={[styles.publisherSummary, { color: colors.mutedForeground }]} numberOfLines={3}>{item.summary}</Text>
                    <View style={styles.publisherFooter}>
                      <Text style={[styles.publisherRead, { color: colors.amber }]}>Read more</Text>
                      <Feather name="chevron-right" size={14} color={colors.amber} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderCommunityTab = () => (
    communities.length === 0 ? (
      <EmptyState icon="users" message="Select a city to discover local communities." colors={colors} />
    ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad, paddingHorizontal: 16, gap: 12 }}>
        {communities.map((c) => {
          const joined = joinedCommunities.has(c.id);
          return (
            <View key={c.id} style={[styles.communityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.communityTop}>
                <View style={[styles.communityIcon, { backgroundColor: colors.accent }]}>
                  <Feather name={c.icon as any} size={22} color={colors.amber} />
                </View>
                <View style={styles.communityInfo}>
                  <Text style={[styles.communityName, { color: colors.foreground }]}>{c.name}</Text>
                  <View style={styles.communityMeta}>
                    <Feather name="users" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.communityMetaText, { color: colors.mutedForeground }]}>{formatMembers(c.members)} members</Text>
                    <Text style={[styles.communityDot, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.communityMetaText, { color: colors.mutedForeground }]}>{c.activity}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.joinBtn, { backgroundColor: joined ? colors.muted : colors.amber, borderColor: joined ? colors.border : colors.amber }]} onPress={() => toggleJoin(c.id)} activeOpacity={0.8}>
                  <Text style={[styles.joinBtnText, { color: joined ? colors.mutedForeground : "#fff" }]}>{joined ? "Joined" : "Join"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.communityDesc, { color: colors.mutedForeground }]}>{c.description}</Text>
              <View style={styles.communityTags}>
                {c.tags.map((tag) => (
                  <View key={tag} style={[styles.communityTag, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.communityTagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    )
  );

  const renderQATab = () => (
    qaItems.length === 0 ? (
      <EmptyState icon="message-circle" message="Select a city to see local Q&A." colors={colors} />
    ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad, paddingHorizontal: 16, gap: 12 }}>
        <TouchableOpacity style={[styles.askCta, { backgroundColor: colors.accent, borderColor: colors.border }]} activeOpacity={0.8}>
          <View style={[styles.askCtaAvatar, { backgroundColor: colors.muted }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.askCtaText, { color: colors.mutedForeground }]}>Ask something about {selectedCity?.name ?? "your city"}…</Text>
          <View style={[styles.askCtaBtn, { backgroundColor: colors.amber }]}>
            <Feather name="edit-3" size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        {qaItems.map((item) => {
          const isUpvoted = upvotedQA.has(item.id);
          const count = upvoteCounts[item.id] ?? item.upvotes;
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.88} style={[styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.qaTop}>
                <View style={[styles.qaAvatar, { backgroundColor: colors.amber + "20" }]}>
                  <Text style={[styles.qaAvatarText, { color: colors.amber }]}>{item.initials}</Text>
                </View>
                <View style={styles.qaAuthorRow}>
                  <Text style={[styles.qaAuthor, { color: colors.foreground }]}>{item.author}</Text>
                  <Text style={[styles.qaTime, { color: colors.mutedForeground }]}>{timeAgo(item.minutesAgo)}</Text>
                </View>
              </View>
              <Text style={[styles.qaQuestion, { color: colors.foreground }]}>{item.question}</Text>
              <View style={styles.qaTags}>
                {item.tags.map((tag) => (
                  <View key={tag} style={[styles.qaTag, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.qaTagText, { color: colors.mutedForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.qaFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.qaUpvote} onPress={() => toggleUpvote(item.id, item.upvotes)} activeOpacity={0.7}>
                  <Feather name="arrow-up" size={14} color={isUpvoted ? colors.amber : colors.mutedForeground} />
                  <Text style={[styles.qaUpvoteText, { color: isUpvoted ? colors.amber : colors.mutedForeground }]}>{count}</Text>
                </TouchableOpacity>
                <View style={styles.qaAnswerCount}>
                  <Feather name="message-square" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.qaAnswerText, { color: colors.mutedForeground }]}>{item.answers} {item.answers === 1 ? "answer" : "answers"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    )
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      {activeTab === "pulse" && renderPulseTab()}
      {activeTab === "news" && renderNewsTab()}
      {activeTab === "community" && renderCommunityTab()}
      {activeTab === "qa" && renderQATab()}
      <AiChatFab />
    </View>
  );
}

function EmptyState({
  icon,
  message,
  colors,
}: {
  icon: string;
  message: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.icon, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[emptyStyles.text, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  text: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingBottom: 0 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 10 },
  wordmark: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -0.5 },
  wordmarkSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 10 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabUnderline: { height: 2, width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  happeningSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 12, paddingTop: 12 },
  happeningSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  happeningLiveDotWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  happeningLiveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ef4444" },
  happeningSectionLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  happeningScroll: { paddingHorizontal: 16, gap: 8 },
  happeningCard: { width: 220, borderRadius: 14, borderWidth: 1, padding: 12, gap: 6, ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } }) },
  happeningIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  happeningText: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  happeningTime: { fontFamily: "Inter_400Regular", fontSize: 10 },
  pulseList: { paddingHorizontal: 16, gap: 12, paddingTop: 4, paddingBottom: 4 },
  heroCard: { borderRadius: 22, overflow: "hidden", height: 360, ...Platform.select({ web: { boxShadow: "0 4px 20px rgba(0,0,0,0.14)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 } }) },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "space-between", padding: 16 },
  heroTop: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  heroSponsoredBadge: { backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  heroSponsoredText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  heroNewBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(34,197,94,0.25)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  heroNewDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#22c55e" },
  heroNewText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#22c55e" },
  heroVideoBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: "auto" },
  heroVideoText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  heroBottom: { gap: 8 },
  heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroLocation: { fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  heroCaption: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff", lineHeight: 24 },
  heroAuthorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroTierDot: { width: 8, height: 8, borderRadius: 4 },
  heroAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  heroMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 2 },
  heroAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroActionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  pulseCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", ...Platform.select({ web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 } }) },
  sponsoredStrip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 6 },
  sponsoredStripText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  cardAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardAvatarText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  cardAuthorMeta: { flex: 1 },
  cardAuthorNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" },
  cardAuthorName: { fontFamily: "Inter_700Bold", fontSize: 14 },
  cardTierDot: { width: 7, height: 7, borderRadius: 3.5 },
  cardNewBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardNewDot: { width: 5, height: 5, borderRadius: 2.5 },
  cardNewText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  cardMetaLine: { fontFamily: "Inter_400Regular", fontSize: 11 },
  cardMore: { padding: 4 },
  cardCaption: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 10 },
  cardMediaWrap: { position: "relative" },
  cardMedia: { width: "100%", height: 200 },
  cardVideoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.22)" },
  cardPlayBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingLeft: 3 },
  cardDurationBadge: { position: "absolute", bottom: 8, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  cardDurationText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  cardActions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 5, marginRight: 16 },
  cardActionCount: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  cardActionSpacer: { flex: 1 },
  trendingInsert: { borderRadius: 16, padding: 14, marginBottom: 4 },
  trendingHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  trendingLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  trendingScroll: { gap: 8 },
  trendingChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  trendingChipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  pulseNewsCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", ...Platform.select({ web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 } }) },
  pulseNewsImage: { width: "100%", height: 180, backgroundColor: "#e5e7eb" },
  pulseNewsBody: { padding: 12, gap: 8 },
  pulseNewsTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pulseNewsSource: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 12 },
  pulseNewsTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  pulseNewsTagRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pulseNewsHeadline: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 21 },
  pulseNewsSummary: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  pulseNewsShort: { fontFamily: "Inter_400Regular", fontSize: 11 },
  pulseNewsTag: { fontFamily: "Inter_700Bold", fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  newsList: { paddingHorizontal: 16, gap: 10 },
  publisherCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, ...Platform.select({ web: { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 } }) },
  publisherTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  publisherSourceRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  publisherIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  publisherMeta: { flex: 1, minWidth: 0 },
  publisherSource: { fontFamily: "Inter_700Bold", fontSize: 13 },
  publisherMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
  publisherTime: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  publisherTag: { fontFamily: "Inter_700Bold", fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  publisherShortLabel: { fontFamily: "Inter_700Bold", fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  publisherDot: { fontFamily: "Inter_400Regular", fontSize: 11 },
  publisherBody: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  publisherImage: { width: 96, height: 96, borderRadius: 14, backgroundColor: "#e5e7eb" },
  publisherContent: { flex: 1, minWidth: 0, gap: 8 },
  publisherHeadline: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 23, letterSpacing: -0.2 },
  publisherSummary: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  publisherFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  publisherRead: { fontFamily: "Inter_700Bold", fontSize: 12 },
  communityCard: { borderRadius: 18, borderWidth: 1, padding: 16, ...Platform.select({ web: { boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 } }) },
  communityTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  communityIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  communityInfo: { flex: 1 },
  communityName: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 3 },
  communityMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  communityMetaText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  communityDot: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  communityDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  communityTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  communityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  communityTagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  askCta: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  askCtaAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  askCtaText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },
  askCtaBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qaCard: { borderRadius: 16, borderWidth: 1, padding: 14, ...Platform.select({ web: { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 } }) },
  qaTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  qaAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qaAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  qaAuthorRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qaAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  qaTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  qaQuestion: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22, marginBottom: 10 },
  qaTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  qaTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  qaTagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  qaFooter: { flexDirection: "row", alignItems: "center", gap: 20, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  qaUpvote: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaUpvoteText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  qaAnswerCount: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaAnswerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
