import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetEvents, useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EventCard } from "@/components/EventCard";
import { DealCard } from "@/components/DealCard";
import { SkeletonCard } from "@/components/SkeletonCard";

// ─── Types ────────────────────────────────────────────────────

type MainTab = "all" | "news" | "community" | "qa";

interface NewsItem {
  id: number;
  type: "traffic" | "weather" | "civic" | "breaking" | "transit";
  headline: string;
  summary: string;
  source: string;
  minutesAgo: number;
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

// ─── Static city data ─────────────────────────────────────────

const NEWS_DATA: Record<string, NewsItem[]> = {
  Mumbai: [
    { id: 1, type: "traffic",  headline: "Heavy traffic on Western Express Highway near Borivali", summary: "Expect 45–60 min delays. Use Jogeshwari–Vikhroli Link Road as alternate.", source: "Mumbai Traffic Police", minutesAgo: 12 },
    { id: 2, type: "civic",    headline: "BMC announces water cut in Andheri and Bandra today", summary: "Supply will remain off from 10am–6pm for pipeline maintenance.", source: "MCGM", minutesAgo: 45 },
    { id: 3, type: "weather",  headline: "Orange alert issued for Mumbai: heavy rain for 48 hrs", summary: "IMD warns of flooding in low-lying areas. Avoid coastal roads.", source: "IMD Mumbai", minutesAgo: 90 },
    { id: 4, type: "transit",  headline: "Central line disruption between Kurla and Thane", summary: "Services delayed by 15 min due to track maintenance at Vikhroli.", source: "CR Rail", minutesAgo: 130 },
    { id: 5, type: "breaking", headline: "Dharavi redevelopment project breaks ground officially", summary: "Maharashtra CM inaugurates the ₹20,000 Cr project with 350 acres to be redeveloped.", source: "Hindustan Times", minutesAgo: 200 },
  ],
  Bangalore: [
    { id: 1, type: "civic",    headline: "Namma Metro Phase 2 Whitefield extension opens next month", summary: "The 13.71 km stretch will add 12 new stations, cutting Whitefield–MG Road to 35 min.", source: "BMRCL", minutesAgo: 20 },
    { id: 2, type: "traffic",  headline: "Silk Board junction signal upgrade causes delays", summary: "Electronic signal system replacement underway. Expect 30 min peak-hour delays.", source: "BBMP Traffic", minutesAgo: 55 },
    { id: 3, type: "weather",  headline: "Bengaluru receives unseasonal heavy showers", summary: "Outer Ring Road and Sarjapur Road report waterlogging. Drive carefully.", source: "IMD Bengaluru", minutesAgo: 100 },
    { id: 4, type: "transit",  headline: "BMTC introduces 10 new AC bus routes in North Bangalore", summary: "Routes connect Hebbal, Yelahanka, and Kempegowda International Airport.", source: "BMTC", minutesAgo: 180 },
    { id: 5, type: "breaking", headline: "BBMP pothole repair drive begins in HSR Layout, Koramangala", summary: "Ward-level teams deployed with target to fix 2,000 potholes in 2 weeks.", source: "Deccan Herald", minutesAgo: 240 },
  ],
  "New York City": [
    { id: 1, type: "transit",  headline: "MTA: Weekend subway service changes on A, C, E lines", summary: "No A train service between Howard Beach and Far Rockaway Sat–Sun.", source: "MTA", minutesAgo: 8 },
    { id: 2, type: "weather",  headline: "NYC Heat Advisory in effect through Thursday", summary: "Heat index values up to 105°F. Cooling centers open across all five boroughs.", source: "NWS New York", minutesAgo: 60 },
    { id: 3, type: "civic",    headline: "Times Square pedestrian safety redesign unveiled", summary: "New protected lanes and wider sidewalks approved by City Council.", source: "NYC DOT", minutesAgo: 120 },
    { id: 4, type: "traffic",  headline: "BQE lane closures: expect delays toward Brooklyn Bridge", summary: "Two lanes closed for emergency deck repair. Use alternate bridge crossings.", source: "NYSDOT", minutesAgo: 160 },
    { id: 5, type: "breaking", headline: "NYC Marathon route closures announced for Sunday", summary: "Over 60 streets close from Staten Island Ferry terminal through Central Park.", source: "NYRR", minutesAgo: 210 },
  ],
  "San Francisco": [
    { id: 1, type: "transit",  headline: "BART strike averted — service continues as normal", summary: "Union and BART management reach tentative agreement. All lines running.", source: "BART", minutesAgo: 15 },
    { id: 2, type: "weather",  headline: "Dense fog advisory for Golden Gate Bridge until noon", summary: "Visibility under ¼ mile. Bridge speed limit reduced to 45 mph.", source: "NWS Bay Area", minutesAgo: 70 },
    { id: 3, type: "civic",    headline: "SF expands overnight shelter capacity by 300 beds", summary: "New Navigation Center opens in SOMA district under Mayor's winter plan.", source: "SF Chronicle", minutesAgo: 140 },
    { id: 4, type: "traffic",  headline: "Bay Bridge westbound lane closure: Friday evening", summary: "One lane closed from 8pm–5am for seismic sensor installation.", source: "Bay Bridge", minutesAgo: 190 },
    { id: 5, type: "breaking", headline: "PG&E Public Safety Power Shutoff possible this weekend", summary: "Fire weather watch issued. Up to 12,000 homes in fire risk zones may lose power.", source: "PG&E", minutesAgo: 250 },
  ],
};

const COMMUNITY_DATA: Record<string, Community[]> = {
  Mumbai: [
    { id: 1, name: "Mumbai Foodies", description: "Best street eats, restaurant reviews, and hidden gems across the city.", icon: "coffee", members: 42800, activity: "120 posts today", tags: ["Food", "Restaurants", "Street Food"] },
    { id: 2, name: "Mumbai Local Train Riders", description: "Tips, route hacks, and daily updates for local train commuters.", icon: "share-2", members: 31500, activity: "88 posts today", tags: ["Transit", "Commute", "Western", "Central"] },
    { id: 3, name: "Bandra Residents", description: "Hyperlocal updates, events, and community issues for Bandra folks.", icon: "home", members: 9200, activity: "24 posts today", tags: ["Bandra", "Local", "Events"] },
    { id: 4, name: "Mumbai Cricket Fans", description: "Live match discussions, Wankhede events, and cricket banter.", icon: "activity", members: 56000, activity: "310 posts today", tags: ["Cricket", "Sports", "IPL"] },
  ],
  Bangalore: [
    { id: 1, name: "Namma Bengaluru Foodies", description: "From MTR to microbreweries — all things food in Bangalore.", icon: "coffee", members: 38200, activity: "95 posts today", tags: ["Food", "Restaurants", "Cafes"] },
    { id: 2, name: "Bangalore Tech Community", description: "Meetups, job postings, and startup news for Bangalore's tech scene.", icon: "code", members: 67400, activity: "210 posts today", tags: ["Tech", "Startups", "Jobs", "Meetups"] },
    { id: 3, name: "Koramangala Connect", description: "Residents and businesses of Koramangala sharing local updates.", icon: "home", members: 12100, activity: "41 posts today", tags: ["Koramangala", "Local", "Housing"] },
    { id: 4, name: "BLR Cyclists", description: "Weekend rides, routes, and cycling advocacy across Bangalore.", icon: "wind", members: 8700, activity: "18 posts today", tags: ["Cycling", "Fitness", "Outdoors"] },
  ],
  "New York City": [
    { id: 1, name: "NYC Food Scene", description: "Restaurant discoveries, chef news, and the best pizza debates.", icon: "coffee", members: 89600, activity: "450 posts today", tags: ["Food", "Restaurants", "Pizza", "Brunch"] },
    { id: 2, name: "Brooklyn Residents", description: "Community news, events, and neighbourhood updates for Brooklyn.", icon: "home", members: 43000, activity: "130 posts today", tags: ["Brooklyn", "Local", "Events"] },
    { id: 3, name: "NYC Photography Club", description: "Share your city shots, join photo walks, and get feedback.", icon: "aperture", members: 22300, activity: "76 posts today", tags: ["Photography", "Art", "Creative"] },
    { id: 4, name: "Commuter Warriors NYC", description: "Subway hacks, MTA complaints, and commuter solidarity.", icon: "share-2", members: 31800, activity: "195 posts today", tags: ["Transit", "MTA", "Subway", "Commute"] },
  ],
  "San Francisco": [
    { id: 1, name: "SF Bay Foodies", description: "Farm-to-table finds, Mission burritos, and Michelin guides.", icon: "coffee", members: 34500, activity: "110 posts today", tags: ["Food", "Restaurants", "Mission"] },
    { id: 2, name: "Mission District Community", description: "Hyperlocal issues, murals, events and housing news.", icon: "home", members: 11200, activity: "38 posts today", tags: ["Mission", "Local", "Housing"] },
    { id: 3, name: "SF Tech Founders", description: "Startup stories, investor intros, and SoMa office chatter.", icon: "code", members: 48900, activity: "220 posts today", tags: ["Tech", "Startups", "VC", "Founders"] },
    { id: 4, name: "Golden Gate Cyclists", description: "Bridge crossings, Marin trails, and bike commute tips.", icon: "wind", members: 9600, activity: "29 posts today", tags: ["Cycling", "Outdoors", "GGBP"] },
  ],
};

const QA_DATA: Record<string, QAItem[]> = {
  Mumbai: [
    { id: 1, question: "Best time to travel on the Western Line to avoid rush hour?", author: "Rahul M.", initials: "RM", tags: ["Transit", "Western Line"], upvotes: 128, answers: 14, minutesAgo: 30 },
    { id: 2, question: "Which areas have the best street food near Marine Drive?", author: "Priya K.", initials: "PK", tags: ["Food", "Marine Drive"], upvotes: 94, answers: 22, minutesAgo: 90 },
    { id: 3, question: "How do I apply for an emergency water connection via BMC?", author: "Sanjay D.", initials: "SD", tags: ["Civic", "BMC", "Utilities"], upvotes: 47, answers: 8, minutesAgo: 200 },
    { id: 4, question: "Is there parking near Bandra Kurla Complex on weekends?", author: "Aisha T.", initials: "AT", tags: ["Parking", "BKC"], upvotes: 63, answers: 11, minutesAgo: 310 },
  ],
  Bangalore: [
    { id: 1, question: "Which Namma Metro stations have reliable bike parking?", author: "Karthik R.", initials: "KR", tags: ["Metro", "Parking", "Cycling"], upvotes: 112, answers: 17, minutesAgo: 20 },
    { id: 2, question: "Best co-working spaces near Indiranagar with good wifi?", author: "Sneha V.", initials: "SV", tags: ["Work", "Indiranagar", "Coworking"], upvotes: 87, answers: 19, minutesAgo: 80 },
    { id: 3, question: "How to navigate BBMP property tax payment issues online?", author: "Mohan P.", initials: "MP", tags: ["Civic", "BBMP", "Tax"], upvotes: 55, answers: 9, minutesAgo: 180 },
    { id: 4, question: "Auto-rickshaw refusing meter — what are my options?", author: "Divya L.", initials: "DL", tags: ["Transit", "Auto", "Rights"], upvotes: 201, answers: 31, minutesAgo: 260 },
  ],
  "New York City": [
    { id: 1, question: "Fastest subway route from JFK to Midtown on a Sunday?", author: "Jake S.", initials: "JS", tags: ["Transit", "Subway", "JFK"], upvotes: 156, answers: 24, minutesAgo: 15 },
    { id: 2, question: "Are Citi Bikes worth it for daily commuting in Brooklyn?", author: "Maya L.", initials: "ML", tags: ["Cycling", "Citi Bike", "Brooklyn"], upvotes: 88, answers: 16, minutesAgo: 75 },
    { id: 3, question: "Best bagel spots open before 7am in Lower Manhattan?", author: "Dave R.", initials: "DR", tags: ["Food", "Bagels", "Manhattan"], upvotes: 213, answers: 38, minutesAgo: 130 },
    { id: 4, question: "How does alternate-side parking work for alternate days?", author: "Kim W.", initials: "KW", tags: ["Parking", "Rules", "Civic"], upvotes: 72, answers: 14, minutesAgo: 290 },
  ],
  "San Francisco": [
    { id: 1, question: "Is BART safe to take late at night to Oakland?", author: "Tom H.", initials: "TH", tags: ["BART", "Safety", "Oakland"], upvotes: 142, answers: 29, minutesAgo: 25 },
    { id: 2, question: "Best neighborhoods for young professionals moving to SF?", author: "Ava C.", initials: "AC", tags: ["Housing", "Neighborhoods", "Moving"], upvotes: 198, answers: 43, minutesAgo: 60 },
    { id: 3, question: "How does the SF residential parking permit system work?", author: "Leo B.", initials: "LB", tags: ["Parking", "Permit", "Civic"], upvotes: 67, answers: 12, minutesAgo: 150 },
    { id: 4, question: "What's the deal with the SFMTA Muni app — is it accurate?", author: "Nora F.", initials: "NF", tags: ["Transit", "Muni", "App"], upvotes: 95, answers: 18, minutesAgo: 220 },
  ],
};

const DEFAULT_NEWS: NewsItem[] = [
  { id: 1, type: "civic", headline: "Select a city to see local news and alerts.", summary: "Use the city picker to view news relevant to your area.", source: "inMyCity", minutesAgo: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────

const NEWS_COLORS: Record<NewsItem["type"], { bg: string; fg: string; label: string; icon: string }> = {
  breaking: { bg: "#fef2f2", fg: "#ef4444", label: "Breaking", icon: "zap" },
  traffic:  { bg: "#fff7ed", fg: "#f97316", label: "Traffic",  icon: "alert-triangle" },
  weather:  { bg: "#eff6ff", fg: "#3b82f6", label: "Weather",  icon: "cloud-rain" },
  civic:    { bg: "#f0fdf4", fg: "#22c55e", label: "Civic",    icon: "info" },
  transit:  { bg: "#f0f9ff", fg: "#06b6d4", label: "Transit",  icon: "share-2" },
};

function timeAgo(min: number) {
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}

function formatMembers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

// ─── Main Component ───────────────────────────────────────────

const TABS: { id: MainTab; label: string; icon: string }[] = [
  { id: "all",       label: "All",       icon: "grid"     },
  { id: "news",      label: "News",      icon: "bell"     },
  { id: "community", label: "Community", icon: "users"    },
  { id: "qa",        label: "Q&A",       icon: "message-circle" },
];

export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState<MainTab>("all");
  const [joinedCommunities, setJoinedCommunities] = useState<Set<number>>(new Set());
  const [upvotedQA, setUpvotedQA] = useState<Set<number>>(new Set());
  const [upvoteCounts, setUpvoteCounts] = useState<Record<number, number>>({});

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } =
    useGetEvents({ city: cityName });
  const { data: deals = [], isLoading: dealsLoading, refetch: refetchDeals } =
    useGetDeals({ city: cityName });

  const news = (cityName && NEWS_DATA[cityName]) ?? DEFAULT_NEWS;
  const communities = (cityName && COMMUNITY_DATA[cityName]) ?? [];
  const qaItems = (cityName && QA_DATA[cityName]) ?? [];

  const toggleJoin = (id: number) => {
    setJoinedCommunities((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUpvote = (id: number, base: number) => {
    setUpvotedQA((prev) => {
      const next = new Set(prev);
      const wasUpvoted = next.has(id);
      wasUpvoted ? next.delete(id) : next.add(id);
      setUpvoteCounts((c) => ({ ...c, [id]: wasUpvoted ? base : base + 1 }));
      return next;
    });
  };

  // ── ALL tab feed ──────────────────────────────────────────
  type FeedItem =
    | { kind: "event";     data: typeof events[number] }
    | { kind: "deal";      data: typeof deals[number]; promoted?: boolean }
    | { kind: "news";      data: NewsItem }
    | { kind: "community"; data: Community }
    | { kind: "qa";        data: QAItem };

  const allFeed: FeedItem[] = [];
  const maxLen = Math.max(events.length, deals.length);
  // Inject news/community/qa in rotation after every 2 API-item pairs
  const injectOrder: Array<"news" | "community" | "qa"> = ["news", "community", "qa"];
  let ni = 0, ci = 0, qi = 0, injIdx = 0;
  for (let i = 0; i < maxLen; i++) {
    if (i < events.length) allFeed.push({ kind: "event", data: events[i] });
    if (i < deals.length)  allFeed.push({ kind: "deal", data: deals[i], promoted: i % 4 === 1 });
    // After every pair of API items, splice in one content card
    if (i % 2 === 1) {
      const type = injectOrder[injIdx % injectOrder.length];
      if      (type === "news"      && ni < news.length)         allFeed.push({ kind: "news",      data: news[ni++] });
      else if (type === "community" && ci < communities.length)  allFeed.push({ kind: "community", data: communities[ci++] });
      else if (type === "qa"        && qi < qaItems.length)      allFeed.push({ kind: "qa",        data: qaItems[qi++] });
      injIdx++;
    }
  }
  const isAllLoading = eventsLoading || dealsLoading;

  // ── Header (fixed) ────────────────────────────────────────
  const header = (
    <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Feeds</Text>
          {selectedCity && (
            <View style={styles.cityRow}>
              <Feather name="map-pin" size={11} color={colors.amber} />
              <Text style={[styles.cityName, { color: colors.mutedForeground }]}>{selectedCity.name}</Text>
            </View>
          )}
        </View>
        <View style={[styles.liveChip, { backgroundColor: "#ef444420" }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: "#ef4444" }]}>Live</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tabInner}>
                <Feather name={tab.icon as any} size={14} color={active ? colors.amber : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: active ? colors.amber : colors.mutedForeground }]}>
                  {tab.label}
                </Text>
              </View>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.amber }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── ALL tab ───────────────────────────────────────────────
  const renderAllTab = () => (
    isAllLoading ? (
      <View style={{ paddingTop: 12 }}>
        {[180, 140, 180, 140].map((h, i) => <SkeletonCard key={i} height={h} style={styles.skeleton} />)}
      </View>
    ) : allFeed.length === 0 ? (
      <EmptyState icon="layers" message={`No updates in ${selectedCity?.name ?? "your city"} yet.`} colors={colors} />
    ) : (
      <FlatList
        data={allFeed}
        keyExtractor={(item, i) => `${item.kind}-${item.data.id}-${i}`}
        renderItem={({ item }) => {
          if (item.kind === "event") return <EventCard event={item.data} />;

          if (item.kind === "deal") return (
            <View>
              {item.promoted && (
                <View style={[styles.promotedBanner, { backgroundColor: colors.accent }]}>
                  <Feather name="star" size={11} color={colors.amber} />
                  <Text style={[styles.promotedText, { color: colors.amber }]}>Sponsored</Text>
                </View>
              )}
              <DealCard deal={item.data} />
            </View>
          );

          if (item.kind === "news") {
            const meta = NEWS_COLORS[item.data.type];
            return (
              <View style={[styles.inlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inlineCardHeader}>
                  <View style={[styles.newsBadge, { backgroundColor: meta.bg }]}>
                    <Feather name={meta.icon as any} size={11} color={meta.fg} />
                    <Text style={[styles.newsBadgeText, { color: meta.fg }]}>{meta.label}</Text>
                  </View>
                  <Text style={[styles.newsTime, { color: colors.mutedForeground }]}>{timeAgo(item.data.minutesAgo)}</Text>
                </View>
                <Text style={[styles.newsHeadline, { color: colors.foreground }]}>{item.data.headline}</Text>
                <Text style={[styles.newsSummary, { color: colors.mutedForeground }]} numberOfLines={2}>{item.data.summary}</Text>
                <View style={styles.newsFooter}>
                  <Feather name="radio" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.newsSource, { color: colors.mutedForeground }]}>{item.data.source}</Text>
                </View>
              </View>
            );
          }

          if (item.kind === "community") {
            const joined = joinedCommunities.has(item.data.id);
            return (
              <View style={[styles.inlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.communityTop}>
                  <View style={[styles.communityIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={item.data.icon as any} size={20} color={colors.amber} />
                  </View>
                  <View style={styles.communityInfo}>
                    <Text style={[styles.communityName, { color: colors.foreground }]}>{item.data.name}</Text>
                    <View style={styles.communityMeta}>
                      <Feather name="users" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.communityMetaText, { color: colors.mutedForeground }]}>{formatMembers(item.data.members)} members</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: joined ? colors.muted : colors.amber, borderColor: joined ? colors.border : colors.amber }]}
                    onPress={() => toggleJoin(item.data.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.joinBtnText, { color: joined ? colors.mutedForeground : "#fff" }]}>
                      {joined ? "Joined" : "Join"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.communityDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.data.description}</Text>
              </View>
            );
          }

          if (item.kind === "qa") {
            const isUpvoted = upvotedQA.has(item.data.id);
            const count = upvoteCounts[item.data.id] ?? item.data.upvotes;
            return (
              <View style={[styles.inlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.qaTop}>
                  <View style={[styles.qaAvatar, { backgroundColor: colors.amber + "20" }]}>
                    <Text style={[styles.qaAvatarText, { color: colors.amber }]}>{item.data.initials}</Text>
                  </View>
                  <View style={styles.qaAuthorRow}>
                    <Text style={[styles.qaAuthor, { color: colors.foreground }]}>{item.data.author}</Text>
                    <Text style={[styles.qaTime, { color: colors.mutedForeground }]}>{timeAgo(item.data.minutesAgo)}</Text>
                  </View>
                </View>
                <Text style={[styles.qaQuestion, { color: colors.foreground }]}>{item.data.question}</Text>
                <View style={[styles.qaFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={styles.qaUpvote} onPress={() => toggleUpvote(item.data.id, item.data.upvotes)} activeOpacity={0.7}>
                    <Feather name="arrow-up" size={14} color={isUpvoted ? colors.amber : colors.mutedForeground} />
                    <Text style={[styles.qaUpvoteText, { color: isUpvoted ? colors.amber : colors.mutedForeground }]}>{count}</Text>
                  </TouchableOpacity>
                  <View style={styles.qaAnswerCount}>
                    <Feather name="message-square" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.qaAnswerText, { color: colors.mutedForeground }]}>{item.data.answers} answers</Text>
                  </View>
                </View>
              </View>
            );
          }

          return null;
        }}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => { refetchEvents(); refetchDeals(); }}
        refreshing={isAllLoading}
      />
    )
  );

  // ── NEWS tab ──────────────────────────────────────────────
  const renderNewsTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPadding, paddingHorizontal: 16, gap: 10 }}
    >
      {news.map((item) => {
        const meta = NEWS_COLORS[item.type];
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.newsHeader}>
              <View style={[styles.newsBadge, { backgroundColor: meta.bg }]}>
                <Feather name={meta.icon as any} size={11} color={meta.fg} />
                <Text style={[styles.newsBadgeText, { color: meta.fg }]}>{meta.label}</Text>
              </View>
              <Text style={[styles.newsTime, { color: colors.mutedForeground }]}>
                {timeAgo(item.minutesAgo)}
              </Text>
            </View>
            <Text style={[styles.newsHeadline, { color: colors.foreground }]}>{item.headline}</Text>
            <Text style={[styles.newsSummary, { color: colors.mutedForeground }]}>{item.summary}</Text>
            <View style={styles.newsFooter}>
              <Feather name="radio" size={11} color={colors.mutedForeground} />
              <Text style={[styles.newsSource, { color: colors.mutedForeground }]}>{item.source}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── COMMUNITY tab ─────────────────────────────────────────
  const renderCommunityTab = () => (
    communities.length === 0 ? (
      <EmptyState icon="users" message="Select a city to discover local communities." colors={colors} />
    ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPadding, paddingHorizontal: 16, gap: 12 }}
      >
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
                    <Text style={[styles.communityMetaText, { color: colors.mutedForeground }]}>
                      {formatMembers(c.members)} members
                    </Text>
                    <Text style={[styles.communityDot, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.communityMetaText, { color: colors.mutedForeground }]}>{c.activity}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.joinBtn,
                    { backgroundColor: joined ? colors.muted : colors.amber, borderColor: joined ? colors.border : colors.amber },
                  ]}
                  onPress={() => toggleJoin(c.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.joinBtnText, { color: joined ? colors.mutedForeground : "#fff" }]}>
                    {joined ? "Joined" : "Join"}
                  </Text>
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

  // ── Q&A tab ───────────────────────────────────────────────
  const renderQATab = () => (
    qaItems.length === 0 ? (
      <EmptyState icon="message-circle" message="Select a city to see local Q&A." colors={colors} />
    ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPadding, paddingHorizontal: 16, gap: 12 }}
      >
        {/* Ask CTA */}
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
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              style={[styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
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
                <TouchableOpacity
                  style={styles.qaUpvote}
                  onPress={() => toggleUpvote(item.id, item.upvotes)}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-up" size={14} color={isUpvoted ? colors.amber : colors.mutedForeground} />
                  <Text style={[styles.qaUpvoteText, { color: isUpvoted ? colors.amber : colors.mutedForeground }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
                <View style={styles.qaAnswerCount}>
                  <Feather name="message-square" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.qaAnswerText, { color: colors.mutedForeground }]}>
                    {item.answers} {item.answers === 1 ? "answer" : "answers"}
                  </Text>
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
      {activeTab === "all"       && renderAllTab()}
      {activeTab === "news"      && renderNewsTab()}
      {activeTab === "community" && renderCommunityTab()}
      {activeTab === "qa"        && renderQATab()}
    </View>
  );
}

// ─── Shared sub-component ────────────────────────────────────

function EmptyState({
  icon, message, colors,
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

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeleton: { marginHorizontal: 16, marginBottom: 12 },

  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingBottom: 10,
  },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.3 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cityName: { fontFamily: "Inter_500Medium", fontSize: 12 },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1, alignItems: "center",
  },
  tabInner: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 10,
  },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabUnderline: {
    height: 2, width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },

  promotedBanner: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginHorizontal: 16, marginTop: 6, marginBottom: -4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start",
  },
  promotedText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },

  inlineCard: {
    marginHorizontal: 16, marginVertical: 6, borderRadius: 16, borderWidth: 1, padding: 14,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
  inlineCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  // News
  newsCard: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
  newsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  newsBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  newsBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  newsTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  newsHeadline: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 21 },
  newsSummary: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  newsFooter: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  newsSource: { fontFamily: "Inter_500Medium", fontSize: 11 },

  // Community
  communityCard: {
    borderRadius: 18, borderWidth: 1, padding: 16,
    ...Platform.select({
      web: { boxShadow: "0 1px 8px rgba(0,0,0,0.07)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    }),
  },
  communityTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  communityIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  communityInfo: { flex: 1 },
  communityName: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 3 },
  communityMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  communityMetaText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  communityDot: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  communityDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  communityTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  communityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  communityTagText: { fontFamily: "Inter_500Medium", fontSize: 11 },

  // Q&A
  askCta: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  askCtaAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  askCtaText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },
  askCtaBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qaCard: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
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
  qaFooter: {
    flexDirection: "row", alignItems: "center", gap: 20,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  qaUpvote: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaUpvoteText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  qaAnswerCount: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaAnswerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
