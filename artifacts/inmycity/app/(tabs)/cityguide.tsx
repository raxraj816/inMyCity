import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { AppHeader } from "@/components/AppHeader";
import { AiChatFab } from "@/components/AiChatFab";
import {
  useGetItineraries,
  useGetPlaces,
  useGetEvents,
  useGetHotels,
  useGetActivities,
  type Itinerary,
  type ItineraryStop,
  type Place,
  type Event,
  type Hotel,
  type Activity,
} from "@workspace/api-client-react";

const CITY_META: Record<string, { tagline: string; tips: { icon: string; label: string; value: string }[] }> = {
  Mumbai: {
    tagline: "The City of Dreams",
    tips: [
      { icon: "sun", label: "Best Season", value: "Nov – Feb" },
      { icon: "navigation", label: "Getting Around", value: "Metro & Local Trains" },
      { icon: "phone", label: "Emergency", value: "112" },
      { icon: "globe", label: "Language", value: "Marathi, Hindi, English" },
      { icon: "dollar-sign", label: "Tipping", value: "5–10% is common" },
    ],
  },
  Bangalore: {
    tagline: "The Garden City",
    tips: [
      { icon: "sun", label: "Best Season", value: "Oct – Feb" },
      { icon: "navigation", label: "Getting Around", value: "Metro & Auto-Rickshaw" },
      { icon: "phone", label: "Emergency", value: "112" },
      { icon: "globe", label: "Language", value: "Kannada, English" },
      { icon: "dollar-sign", label: "Tipping", value: "5–10% is common" },
    ],
  },
  "New York City": {
    tagline: "The City That Never Sleeps",
    tips: [
      { icon: "sun", label: "Best Season", value: "Apr – Jun, Sep – Nov" },
      { icon: "navigation", label: "Getting Around", value: "Subway & Bus" },
      { icon: "phone", label: "Emergency", value: "911" },
      { icon: "globe", label: "Language", value: "English, Spanish" },
      { icon: "dollar-sign", label: "Tipping", value: "18–20% is standard" },
    ],
  },
  "San Francisco": {
    tagline: "The City by the Bay",
    tips: [
      { icon: "sun", label: "Best Season", value: "Sep – Nov" },
      { icon: "navigation", label: "Getting Around", value: "BART & Muni" },
      { icon: "phone", label: "Emergency", value: "911" },
      { icon: "globe", label: "Language", value: "English, Spanish" },
      { icon: "dollar-sign", label: "Tipping", value: "18–20% is standard" },
    ],
  },
};

const DEFAULT_META = {
  tagline: "Discover this city",
  tips: [
    { icon: "sun", label: "Best Season", value: "Check locally" },
    { icon: "navigation", label: "Getting Around", value: "Public Transit" },
    { icon: "phone", label: "Emergency", value: "Local number" },
    { icon: "globe", label: "Language", value: "Local language" },
    { icon: "dollar-sign", label: "Tipping", value: "Ask locally" },
  ],
};

const PLACE_FILTERS = [
  { id: "all", label: "All" },
  { id: "attraction", label: "Attractions" },
  { id: "nightlife", label: "Nightlife" },
  { id: "essentials", label: "Essentials" },
];

const ACTIVITY_SORT_OPTIONS = [
  { id: "popular", label: "Popular" },
  { id: "top_rated", label: "Top Rated" },
  { id: "free_first", label: "Free First" },
  { id: "price_low", label: "Price ↑" },
];

const ACTIVITY_DURATION_FILTERS = [
  { id: "all", label: "All" },
  { id: "short", label: "< 2 hrs" },
  { id: "half", label: "Half Day" },
  { id: "full", label: "Full Day" },
];

const AUDIENCE_FILTERS = [
  { id: "all", label: "All Visitors", icon: "users" },
  { id: "families", label: "Families", icon: "heart" },
  { id: "couples", label: "Couples", icon: "github" },
  { id: "solo", label: "Solo", icon: "user" },
  { id: "outdoor", label: "Outdoor", icon: "sun" },
];

const TIME_OF_DAY = [
  { id: "morning",   label: "Morning",   icon: "sunrise",  color: "#f59e0b", hint: "Before noon",   categories: ["wellness", "sports", "tour"] },
  { id: "afternoon", label: "Afternoon", icon: "sun",      color: "#f97316", hint: "12 pm – 6 pm",  categories: ["cultural", "adventure", "tours"] },
  { id: "evening",   label: "Evening",   icon: "moon",     color: "#6366f1", hint: "After 6 pm",    categories: ["nightlife", "workshop"] },
];

const GUIDE_FILTERS = [
  { id: "all", label: "All" },
  { id: "1", label: "1 Day" },
  { id: "2", label: "2 Days" },
  { id: "3", label: "3 Days" },
  { id: "4", label: "4 Days" },
];

const NEIGHBORHOODS: Record<string, { name: string; vibe: string; color: string }[]> = {
  Mumbai: [
    { name: "Colaba", vibe: "Heritage & cafes", color: "#0ea5e9" },
    { name: "Bandra", vibe: "Food & nightlife", color: "#ec4899" },
    { name: "Juhu", vibe: "Beachfront", color: "#f59e0b" },
    { name: "Fort", vibe: "Old city", color: "#10b981" },
  ],
  Bangalore: [
    { name: "Indiranagar", vibe: "Dining & bars", color: "#ec4899" },
    { name: "Koramangala", vibe: "Startups & food", color: "#0ea5e9" },
    { name: "MG Road", vibe: "Central district", color: "#f59e0b" },
    { name: "Jayanagar", vibe: "Local markets", color: "#10b981" },
  ],
  "New York City": [
    { name: "Manhattan", vibe: "Iconic sights", color: "#0ea5e9" },
    { name: "Brooklyn", vibe: "Creative scene", color: "#ec4899" },
    { name: "Queens", vibe: "Food districts", color: "#f59e0b" },
    { name: "SoHo", vibe: "Shopping & style", color: "#10b981" },
  ],
  "San Francisco": [
    { name: "Fisherman's Wharf", vibe: "Waterfront", color: "#0ea5e9" },
    { name: "Mission", vibe: "Food & murals", color: "#ec4899" },
    { name: "SoMa", vibe: "Museums", color: "#f59e0b" },
    { name: "Nob Hill", vibe: "Classic city", color: "#10b981" },
  ],
};

const QUICK_JUMPS: { label: string; icon: string; color: string; route: string }[] = [
  { label: "Itineraries", icon: "book-open", color: "#6366f1", route: "/itineraries" },
  { label: "Places", icon: "map-pin", color: "#0ea5e9", route: "/places" },
  { label: "Dining", icon: "coffee", color: "#f97316", route: "/dining" },
  { label: "Hotels", icon: "home", color: "#10b981", route: "/hotels" },
  { label: "Events", icon: "calendar", color: "#ec4899", route: "/events" },
];

const CITY_AT_A_GLANCE: Record<string, { currency: string; timezone: string; knownFor: string; tripLength: string }> = {
  Mumbai: { currency: "INR (₹)", timezone: "IST +5:30", knownFor: "Bollywood & Finance", tripLength: "3–5 Days" },
  Bangalore: { currency: "INR (₹)", timezone: "IST +5:30", knownFor: "Tech Hub & Gardens", tripLength: "2–3 Days" },
  "New York City": { currency: "USD ($)", timezone: "EST −5:00", knownFor: "Culture & Skyline", tripLength: "5–7 Days" },
  "San Francisco": { currency: "USD ($)", timezone: "PST −8:00", knownFor: "Tech & Bay Views", tripLength: "3–4 Days" },
};
const DEFAULT_GLANCE = { currency: "Local Currency", timezone: "Local Time", knownFor: "Discover & Explore", tripLength: "2–4 Days" };
const EXTRA_TIPS = [
  { icon: "shield", label: "Safety", value: "Keep valuables secure" },
  { icon: "wifi", label: "Connectivity", value: "eSIM / local SIM" },
  { icon: "credit-card", label: "Payments", value: "UPI & cards accepted" },
  { icon: "coffee", label: "Food", value: "Try local street food" },
  { icon: "cloud-rain", label: "Weather", value: "Pack for humidity" },
];

const HIGHLIGHT_LIMITS = { places: 4, food: 3 };

export default function CityGuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCity } = useCity();
  const [placeFilter, setPlaceFilter] = useState("all");
  const [guideFilter, setGuideFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activitySort, setActivitySort] = useState("popular");
  const [activityDuration, setActivityDuration] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [todTime, setTodTime] = useState("morning");

  const cityName = selectedCity?.name;
  const meta = (cityName ? CITY_META[cityName] : undefined) ?? DEFAULT_META;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const glance = (cityName ? CITY_AT_A_GLANCE[cityName] : undefined) ?? DEFAULT_GLANCE;

  const { data: itineraries = [], isLoading: iLoading, error: iError, refetch: iRefetch } =
    useGetItineraries({ city: cityName });
  const { data: allPlaces = [], isLoading: pLoading } = useGetPlaces({ city: cityName });
  const { data: events = [], isLoading: eLoading } = useGetEvents({ city: cityName });
  const { data: allHotels = [], isLoading: hLoading } = useGetHotels({ city: cityName });
  const { data: activities = [], isLoading: actLoading } = useGetActivities({ city: cityName });

  if (iError) return <ErrorFallback error={iError as Error} resetError={iRefetch} />;

  const filteredPlaces = (
    placeFilter === "all" ? allPlaces : allPlaces.filter((p) => p.category?.toLowerCase() === placeFilter)
  ).slice(0, 10);
  const upcomingEvents = events.slice(0, 5);
  const neighborhoods = (cityName ? NEIGHBORHOODS[cityName] : undefined) ?? [];
  const guideItems = useMemo(() => {
    if (guideFilter === "all") return itineraries;
    return itineraries.filter((itinerary) => String(itinerary.durationDays) === guideFilter);
  }, [guideFilter, itineraries]);
  const placeHighlights = useMemo(
    () => [...allPlaces].filter((p) => p.category?.toLowerCase() !== "food").sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, HIGHLIGHT_LIMITS.places),
    [allPlaces]
  );
  const foodHighlights = useMemo(
    () => [...allPlaces].filter((p) => p.category?.toLowerCase() === "food").sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, HIGHLIGHT_LIMITS.food),
    [allPlaces]
  );
  const topHotels = useMemo(
    () => [...allHotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4),
    [allHotels]
  );
  const topActivities = useMemo(() => {
    let filtered = [...activities];
    if (activityDuration === "short") filtered = filtered.filter((a) => (a.durationMinutes ?? 0) > 0 && (a.durationMinutes ?? 0) <= 120);
    else if (activityDuration === "half") filtered = filtered.filter((a) => (a.durationMinutes ?? 0) > 120 && (a.durationMinutes ?? 0) <= 240);
    else if (activityDuration === "full") filtered = filtered.filter((a) => (a.durationMinutes ?? 0) > 240);
    if (audienceFilter === "families") filtered = filtered.filter((a) => ["cultural", "tour", "tours", "sports"].includes(a.category));
    else if (audienceFilter === "couples") filtered = filtered.filter((a) => ["wellness", "cultural", "adventure"].includes(a.category));
    else if (audienceFilter === "solo") filtered = filtered.filter((a) => ["adventure", "workshop", "sports"].includes(a.category));
    else if (audienceFilter === "outdoor") filtered = filtered.filter((a) => ["adventure", "sports", "tour", "tours"].includes(a.category));
    if (activitySort === "top_rated") filtered = filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (activitySort === "free_first") filtered = filtered.sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
    else if (activitySort === "price_low") filtered = filtered.sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
    else filtered = filtered.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    return filtered.slice(0, 8);
  }, [activities, activitySort, activityDuration, audienceFilter]);

  const freeActivities = useMemo(
    () => [...activities].filter((a) => !a.price || a.price === 0).slice(0, 5),
    [activities]
  );

  const todActivities = useMemo(() => {
    const slot = TIME_OF_DAY.find((t) => t.id === todTime);
    if (!slot) return [];
    return [...activities].filter((a) => slot.categories.includes(a.category)).slice(0, 4);
  }, [activities, todTime]);

  const day1Stops = useMemo(() => {
    const top = itineraries[0];
    if (!top?.stops) return [];
    return top.stops.filter((s) => s.day === 1).sort((a, b) => a.order - b.order).slice(0, 4);
  }, [itineraries]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <AppHeader subtitle="Your Visitor's Guide" topPadding={topPadding} showCityPicker />

        <View style={[styles.heroBanner, { backgroundColor: colors.navy }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Visiting</Text>
              <Text style={styles.heroCity}>{selectedCity?.displayName ?? "Your City"}</Text>
              <Text style={styles.heroTagline}>{meta.tagline}</Text>
            </View>
            <View style={[styles.heroIconBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Feather name="compass" size={36} color="#f97316" />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroFactsScroll}>
            {[
              { icon: "sun", label: "Best season", value: meta.tips.find((t) => t.label === "Best Season")?.value ?? "Check locally" },
              { icon: "navigation", label: "Transit", value: meta.tips.find((t) => t.label === "Getting Around")?.value ?? "Public transit" },
              { icon: "clock", label: "Timezone", value: glance.timezone },
              { icon: "calendar", label: "Trip length", value: glance.tripLength },
              { icon: "credit-card", label: "Currency", value: glance.currency },
            ].map((item) => (
              <View key={item.label} style={styles.heroFactPill}>
                <Feather name={item.icon as any} size={12} color="rgba(249,115,22,0.9)" />
                <View>
                  <Text style={styles.heroFactLabel}>{item.label}</Text>
                  <Text style={styles.heroFactValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.heroDetailsButton}
            onPress={() => setDetailsOpen(true)}
          >
            <Feather name="info" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.heroDetailsButtonText}>Full city details</Text>
            <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={[styles.transitCard, { backgroundColor: "#06b6d4" }]} onPress={() => router.push("/transit")}>
            <View style={[styles.transitIconBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <MaterialCommunityIcons name="train-variant" size={22} color="#fff" />
            </View>
            <View style={styles.transitText}>
              <Text style={styles.transitTitle}>Getting Around</Text>
              <Text style={styles.transitSub}>Metro, bus & train routes for visitors</Text>
            </View>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickJumpScroll}>
          {QUICK_JUMPS.map((jump) => (
            <TouchableOpacity
              key={jump.label}
              style={[styles.quickJumpTile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(jump.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickJumpIcon, { backgroundColor: jump.color + "22" }]}>
                <Feather name={jump.icon as any} size={20} color={jump.color} />
              </View>
              <Text style={[styles.quickJumpLabel, { color: colors.foreground }]}>{jump.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {neighborhoods.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Neighborhoods" icon="map" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.neighborhoodsScroll}>
              {neighborhoods.map((hood) => (
                <TouchableOpacity
                  key={hood.name}
                  activeOpacity={0.8}
                  style={[styles.neighborhoodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push("/places")}
                >
                  <View style={[styles.neighborhoodDot, { backgroundColor: hood.color }]} />
                  <Text style={[styles.neighborhoodName, { color: colors.foreground }]}>{hood.name}</Text>
                  <Text style={[styles.neighborhoodVibe, { color: colors.mutedForeground }]}>{hood.vibe}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Must-See Highlights" icon="star" colors={colors} onSeeAll={() => router.push("/places")} />
          {pLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
            </View>
          ) : placeHighlights.length === 0 ? (
            <EmptySection icon="star" message="No top highlights yet." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {placeHighlights.map((place) => (
                <PlaceGuideCard key={place.id} place={place} colors={colors} onPress={() => router.push(`/place/${place.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Things to Do" icon="activity" colors={colors} onSeeAll={() => router.push("/activities")} />

          {/* Audience chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.audienceScroll}>
            {AUDIENCE_FILTERS.map((f) => {
              const active = audienceFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.audiencePill, { backgroundColor: active ? "#ef4444" : colors.card, borderColor: active ? "#ef4444" : colors.border }]}
                  onPress={() => setAudienceFilter(f.id)}
                >
                  <Feather name={f.icon as any} size={12} color={active ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.audiencePillText, { color: active ? "#fff" : colors.foreground }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Duration + Sort row */}
          <View style={styles.actFilterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.durationScroll}>
              {ACTIVITY_DURATION_FILTERS.map((f) => {
                const active = activityDuration === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.durationPill, { backgroundColor: active ? "#0ea5e9" : colors.muted, borderColor: active ? "#0ea5e9" : "transparent" }]}
                    onPress={() => setActivityDuration(f.id)}
                  >
                    <Text style={[styles.durationPillText, { color: active ? "#fff" : colors.mutedForeground }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSortMenuOpen(true)}
            >
              <Feather name="sliders" size={13} color={colors.mutedForeground} />
              <Text style={[styles.sortBtnText, { color: colors.foreground }]}>
                {ACTIVITY_SORT_OPTIONS.find((s) => s.id === activitySort)?.label ?? "Sort"}
              </Text>
            </TouchableOpacity>
          </View>

          {actLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={260} style={styles.guideSkeletonCard} />
              <SkeletonCard height={260} style={styles.guideSkeletonCard} />
            </View>
          ) : topActivities.length === 0 ? (
            <EmptySection icon="activity" message="No activities match this filter." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {topActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} colors={colors} sort={activitySort} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* FREE EXPERIENCES SECTION */}
        {!actLoading && freeActivities.length > 0 && (
          <View style={[styles.freeSection, { backgroundColor: "#10b981" + "12", borderColor: "#10b98133" }]}>
            <View style={styles.freeSectionHeader}>
              <View style={[styles.freeIconBox, { backgroundColor: "#10b981" }]}>
                <Feather name="gift" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freeSectionTitle, { color: colors.foreground }]}>Free Experiences</Text>
                <Text style={[styles.freeSectionSub, { color: colors.mutedForeground }]}>Explore {cityName ?? "the city"} at no cost</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/activities")}>
                <Text style={[styles.seeAll, { color: "#10b981" }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freeScroll}>
              {freeActivities.map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.freeCard, { backgroundColor: colors.card, borderColor: "#10b98133" }]}
                  onPress={() => router.push(`/activity/${act.id}` as any)}
                  activeOpacity={0.85}
                >
                  {act.imageUrl ? (
                    <Image source={{ uri: act.imageUrl }} style={styles.freeCardImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.freeCardImg, { backgroundColor: colors.muted }]} />
                  )}
                  <View style={styles.freeCardBody}>
                    <Text style={[styles.freeCardName, { color: colors.foreground }]} numberOfLines={2}>{act.name}</Text>
                    <View style={styles.freeCardMeta}>
                      <View style={[styles.freeBadge, { backgroundColor: "#10b981" }]}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                      {act.rating != null && (
                        <View style={styles.freeRating}>
                          <Feather name="star" size={10} color="#f59e0b" />
                          <Text style={[styles.freeRatingText, { color: colors.mutedForeground }]}>{act.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PLAN YOUR DAY SECTION */}
        {!actLoading && activities.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Plan Your Day" icon="clock" colors={colors} />
            <View style={styles.todTabRow}>
              {TIME_OF_DAY.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.todTab, { backgroundColor: todTime === slot.id ? slot.color : colors.card, borderColor: todTime === slot.id ? slot.color : colors.border }]}
                  onPress={() => setTodTime(slot.id)}
                >
                  <Feather name={slot.icon as any} size={14} color={todTime === slot.id ? "#fff" : colors.mutedForeground} />
                  <View>
                    <Text style={[styles.todTabLabel, { color: todTime === slot.id ? "#fff" : colors.foreground }]}>{slot.label}</Text>
                    <Text style={[styles.todTabHint, { color: todTime === slot.id ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{slot.hint}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {todActivities.length === 0 ? (
              <EmptySection icon="clock" message="No activities for this time slot yet." colors={colors} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
                {todActivities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} colors={colors} sort={activitySort} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Taste of the City" icon="coffee" colors={colors} onSeeAll={() => router.push("/dining")} />
          {pLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
            </View>
          ) : foodHighlights.length === 0 ? (
            <EmptySection icon="coffee" message="No food spots yet." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {foodHighlights.map((place) => (
                <PlaceGuideCard key={place.id} place={place} colors={colors} onPress={() => router.push(`/place/${place.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Where to Stay" icon="home" colors={colors} onSeeAll={() => router.push("/hotels")} />
          {hLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={200} style={styles.guideSkeletonCard} />
              <SkeletonCard height={200} style={styles.guideSkeletonCard} />
            </View>
          ) : topHotels.length === 0 ? (
            <EmptySection icon="home" message="No hotels listed yet." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {topHotels.map((hotel) => (
                <HotelGuideCard key={hotel.id} hotel={hotel} colors={colors} onPress={() => router.push(`/hotel/${hotel.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Explore Places" icon="map-pin" colors={colors} onSeeAll={() => router.push("/places")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeFilterScroll}>
            {PLACE_FILTERS.map((f) => {
              const active = placeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, { backgroundColor: active ? "#6366f1" : colors.card, borderColor: active ? "#6366f1" : colors.border }]}
                  onPress={() => setPlaceFilter(f.id)}
                >
                  <Text style={[styles.filterPillText, { color: active ? "#fff" : colors.foreground }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {pLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
            </View>
          ) : filteredPlaces.length === 0 ? (
            <EmptySection icon="map-pin" message={`No ${placeFilter === "all" ? "places" : placeFilter} in ${cityName ?? "this city"} yet.`} colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placesScroll}>
              {filteredPlaces.map((place) => (
                <PlaceGuideCard key={place.id} place={place} colors={colors} onPress={() => router.push(`/place/${place.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Curated Guides" icon="map" colors={colors} onSeeAll={() => router.push("/itineraries" as any)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.guideFilterScroll, { paddingBottom: 8 }]}>
            {GUIDE_FILTERS.map((filter) => {
              const active = guideFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.guideFilterPill, { backgroundColor: active ? "#6366f1" : colors.card, borderColor: active ? "#6366f1" : colors.border }]}
                  onPress={() => setGuideFilter(filter.id)}
                >
                  <Text style={[styles.guideFilterText, { color: active ? "#fff" : colors.foreground }]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {!iLoading && day1Stops.length > 0 && (
            <DayPlanPreview
              stops={day1Stops}
              colors={colors}
              onPress={() => itineraries[0] && router.push(`/itinerary/${itineraries[0].id}` as any)}
            />
          )}
          {iLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
            </View>
          ) : guideItems.length === 0 ? (
            <EmptySection icon="map" message="No guides available for this city yet." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {guideItems.map((itin) => (
                <ItineraryGuideCard key={itin.id} itinerary={itin} colors={colors} onPress={() => router.push(`/itinerary/${itin.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Events in the City" icon="calendar" colors={colors} onSeeAll={() => router.push("/events")} />
          {eLoading ? (
            <>
              <SkeletonCard height={80} style={styles.eventSkeleton} />
              <SkeletonCard height={80} style={styles.eventSkeleton} />
            </>
          ) : upcomingEvents.length === 0 ? (
            <EmptySection icon="calendar" message="No upcoming events right now." colors={colors} />
          ) : (
            upcomingEvents.map((event) => <EventRow key={event.id} event={event} colors={colors} onPress={() => router.push(`/event/${event.id}` as any)} />)
          )}
        </View>
      </ScrollView>

      {/* Sort Menu Modal */}
      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSortMenuOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Sort Activities</Text>
              <TouchableOpacity onPress={() => setSortMenuOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {ACTIVITY_SORT_OPTIONS.map((opt) => {
                const selected = activitySort === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.sortMenuRow, { backgroundColor: selected ? "#ef4444" + "15" : colors.muted, borderColor: selected ? "#ef4444" : colors.border }]}
                    onPress={() => { setActivitySort(opt.id); setSortMenuOpen(false); }}
                  >
                    <Text style={[styles.sortMenuLabel, { color: selected ? "#ef4444" : colors.foreground }]}>{opt.label}</Text>
                    {selected && <Feather name="check" size={16} color="#ef4444" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDetailsOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>City details</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalGlanceGrid}>
              <GlanceStat icon="credit-card" label="Currency" value={glance.currency} colors={colors} />
              <GlanceStat icon="clock" label="Timezone" value={glance.timezone} colors={colors} />
              <GlanceStat icon="trending-up" label="Known For" value={glance.knownFor} colors={colors} />
              <GlanceStat icon="calendar" label="Best Trip" value={glance.tripLength} colors={colors} />
            </View>
            <View style={styles.modalTipList}>
              {[...meta.tips.slice(0, 3), ...EXTRA_TIPS.slice(0, 2)].map((tip) => (
                <View key={`${tip.label}-${tip.value}`} style={[styles.modalTipRow, { borderBottomColor: colors.border }]}>
                  <Feather name={tip.icon as any} size={14} color={colors.amber} />
                  <View style={styles.modalTipText}>
                    <Text style={[styles.modalTipLabel, { color: colors.foreground }]}>{tip.label}</Text>
                    <Text style={[styles.modalTipValue, { color: colors.mutedForeground }]}>{tip.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CityPicker />
      <AiChatFab />
    </View>
  );
}

function SectionHeader({ title, icon, colors, onSeeAll }: { title: string; icon: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onSeeAll?: () => void; }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Feather name={icon as any} size={15} color={colors.amber} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.amber }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptySection({ icon, message, colors }: { icon: string; message: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; }) {
  return (
    <View style={[styles.emptyBox, { backgroundColor: colors.muted }]}>
      <Feather name={icon as any} size={20} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

function PlaceGuideCard({ place, colors, onPress }: { place: Place; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  const categoryColor = place.category === "food" ? "#f97316" : place.category === "attraction" ? "#0ea5e9" : place.category === "nightlife" ? "#ec4899" : place.category === "essentials" ? "#10b981" : colors.mutedForeground;
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.placeImageBox}>
        {place.imageUrl ? <Image source={{ uri: place.imageUrl }} style={styles.placeImage} contentFit="cover" transition={200} /> : <View style={[styles.placeImage, { backgroundColor: colors.muted }]} />}
        <View style={[styles.placeCatBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.placeCatText}>{place.category}</Text>
        </View>
        {place.isOpen !== null && <View style={[styles.openDot, { backgroundColor: place.isOpen ? colors.success : colors.destructive }]} />}
      </View>
      <View style={styles.placeBody}>
        <Text style={[styles.placeName, { color: colors.foreground }]} numberOfLines={2}>{place.name}</Text>
        {place.rating != null && (
          <View style={styles.placeRating}>
            <Feather name="star" size={11} color="#f59e0b" />
            <Text style={[styles.placeRatingText, { color: colors.mutedForeground }]}>{place.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ItineraryGuideCard({ itinerary, colors, onPress }: { itinerary: Itinerary; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.guideImageBox}>
        {itinerary.coverImageUrl ? <Image source={{ uri: itinerary.coverImageUrl }} style={styles.guideImage} contentFit="cover" transition={200} /> : <View style={[styles.guideImage, { backgroundColor: colors.navy }]} />}
        <View style={[styles.guideDayBadge, { backgroundColor: colors.amber }]}>
          <Text style={styles.guideDayText}>{itinerary.durationDays}d</Text>
        </View>
      </View>
      <View style={styles.guideBody}>
        <Text style={[styles.guideCityLabel, { color: colors.amber }]} numberOfLines={1}>{itinerary.city}</Text>
        <Text style={[styles.guideTitle, { color: colors.foreground }]} numberOfLines={2}>{itinerary.title}</Text>
        <View style={styles.guideFooter}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.guideStops, { color: colors.mutedForeground }]}>{itinerary.stops?.length ?? 0} stops</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const HOTEL_CAT_COLORS: Record<string, string> = {
  budget: "#10b981",
  "mid-range": "#0ea5e9",
  luxury: "#f59e0b",
  boutique: "#ec4899",
};

function HotelGuideCard({ hotel, colors, onPress }: { hotel: Hotel; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  const catColor = HOTEL_CAT_COLORS[hotel.category] ?? colors.mutedForeground;
  const isINR = hotel.currency === "INR";
  const priceStr = hotel.pricePerNight != null
    ? `${isINR ? "₹" : "$"}${hotel.pricePerNight.toLocaleString()}/night`
    : null;
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.hotelImageBox}>
        {hotel.imageUrl
          ? <Image source={{ uri: hotel.imageUrl }} style={styles.hotelImage} contentFit="cover" transition={200} />
          : <View style={[styles.hotelImage, { backgroundColor: colors.muted }]} />
        }
        <View style={[styles.hotelCatBadge, { backgroundColor: catColor }]}>
          <Text style={styles.hotelCatText}>{hotel.category}</Text>
        </View>
      </View>
      <View style={styles.hotelBody}>
        <Text style={[styles.hotelName, { color: colors.foreground }]} numberOfLines={2}>{hotel.name}</Text>
        {hotel.rating != null && (
          <View style={styles.hotelRatingRow}>
            <Feather name="star" size={11} color="#f59e0b" />
            <Text style={[styles.hotelRatingText, { color: colors.mutedForeground }]}>{hotel.rating.toFixed(1)}</Text>
          </View>
        )}
        {priceStr && <Text style={[styles.hotelPrice, { color: colors.amber }]}>{priceStr}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function GlanceStat({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; }) {
  return (
    <View style={styles.glanceStat}>
      <View style={[styles.glanceStatIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon as any} size={14} color={colors.amber} />
      </View>
      <View style={styles.glanceStatText}>
        <Text style={[styles.glanceStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.glanceStatValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function CompactStat({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; }) {
  return (
    <View style={styles.compactStat}>
      <Feather name={icon as any} size={12} color={colors.amber} />
      <View style={styles.compactStatText}>
        <Text style={[styles.compactStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.compactStatValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function ActivityCard({ activity, colors }: { activity: Activity; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; }) {
  const isINR = activity.currency === "INR";
  const priceStr = activity.price != null
    ? `${isINR ? "₹" : "$"}${activity.price.toLocaleString()}`
    : "Free";
  const durationStr = activity.durationMinutes != null
    ? activity.durationMinutes >= 60
      ? `${Math.floor(activity.durationMinutes / 60)}h${activity.durationMinutes % 60 > 0 ? ` ${activity.durationMinutes % 60}m` : ""}`
      : `${activity.durationMinutes}m`
    : null;
  const catColors: Record<string, string> = {
    tours: "#6366f1", cultural: "#ec4899", sports: "#10b981",
    fitness: "#f97316", adventure: "#0ea5e9", wellness: "#8b5cf6",
  };
  const catColor = catColors[activity.category] ?? "#6366f1";
  return (
    <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.activityImageBox}>
        {activity.imageUrl
          ? <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} contentFit="cover" transition={200} />
          : <View style={[styles.activityImage, { backgroundColor: colors.muted }]} />}
        <View style={[styles.activityCatBadge, { backgroundColor: catColor }]}>
          <Text style={styles.activityCatText}>{activity.category}</Text>
        </View>
      </View>
      <View style={styles.activityBody}>
        <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={2}>{activity.name}</Text>
        {activity.description != null && (
          <Text style={[styles.activityDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{activity.description}</Text>
        )}
        <View style={styles.activityMeta}>
          {durationStr && (
            <View style={styles.activityMetaItem}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.activityMetaText, { color: colors.mutedForeground }]}>{durationStr}</Text>
            </View>
          )}
          {activity.rating != null && (
            <View style={styles.activityMetaItem}>
              <Feather name="star" size={11} color="#f59e0b" />
              <Text style={[styles.activityMetaText, { color: colors.mutedForeground }]}>{activity.rating.toFixed(1)}</Text>
              {activity.reviewCount != null && (
                <Text style={[styles.activityMetaText, { color: colors.mutedForeground }]}>({activity.reviewCount.toLocaleString()})</Text>
              )}
            </View>
          )}
        </View>
        <View style={[styles.activityPriceRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.activityPrice, { color: colors.amber }]}>{priceStr}</Text>
          <View style={[styles.activityExploreBtn, { backgroundColor: catColor }]}>
            <Text style={styles.activityExploreTxt}>Explore</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DayPlanPreview({ stops, colors, onPress }: { stops: ItineraryStop[]; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.dayPlanCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
      <View style={styles.dayPlanHeader}>
        <Feather name="map" size={14} color={colors.amber} />
        <Text style={[styles.dayPlanTitle, { color: colors.foreground }]}>Day 1 Snapshot</Text>
        <Text style={[styles.dayPlanHint, { color: colors.mutedForeground }]}>Tap to open guide</Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
      <View style={styles.dayPlanStops}>
        {stops.map((stop, idx) => (
          <View key={stop.id} style={styles.dayPlanStopRow}>
            <View style={styles.dayPlanConnector}>
              <View style={[styles.dayPlanDot, { backgroundColor: colors.amber }]} />
              {idx < stops.length - 1 && <View style={[styles.dayPlanLine, { backgroundColor: colors.border }]} />}
            </View>
            <Text style={[styles.dayPlanStopName, { color: colors.foreground }]} numberOfLines={1}>{stop.place.name}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

function EventRow({ event, colors, onPress }: { event: Event; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  const dateStr = event.startDate ? new Date(event.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={[styles.eventDateBox, { backgroundColor: colors.accent }]}>
        <Text style={[styles.eventDateText, { color: colors.amber }]}>{dateStr ?? "—"}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>{event.title}</Text>
        {event.venue && <Text style={[styles.eventVenue, { color: colors.mutedForeground }]} numberOfLines={1}>{event.venue}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBanner: { marginHorizontal: 20, marginBottom: 8, borderRadius: 20, padding: 20, overflow: "hidden", flexDirection: "column" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  heroContent: { flex: 1 },
  heroEyebrow: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 },
  heroCity: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", marginTop: 2 },
  heroTagline: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  heroIconBox: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 14 },
  heroFactsScroll: { gap: 8, paddingBottom: 2 },
  heroFactPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12 },
  heroFactLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.3 },
  heroFactValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff", marginTop: 1 },
  heroDetailsButton: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, alignSelf: "flex-end" },
  heroDetailsButtonText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" },
  section: { marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  guideFilterScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  guideFilterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  guideFilterText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  transitCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  transitIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  transitText: { flex: 1 },
  transitTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  transitSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  tipsScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 10 },
  tipCard: { width: 130, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 6 },
  tipIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tipLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  tipValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 },
  neighborhoodsScroll: { paddingHorizontal: 20, gap: 10 },
  neighborhoodCard: { width: 150, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  neighborhoodDot: { width: 10, height: 10, borderRadius: 5 },
  neighborhoodName: { fontFamily: "Inter_700Bold", fontSize: 14 },
  neighborhoodVibe: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  placeFilterScroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  placesScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },
  placeCard: { width: 160, borderRadius: 16, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 } }) },
  placeImageBox: { height: 110, position: "relative" },
  placeImage: { width: "100%", height: "100%" },
  placeCatBadge: { position: "absolute", bottom: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  placeCatText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff", textTransform: "capitalize" },
  openDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  placeBody: { padding: 10, gap: 5 },
  placeName: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  placeRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  placeRatingText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  guidesScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },
  guideCard: { width: 220, borderRadius: 18, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 } }) },
  guideImageBox: { height: 130, position: "relative" },
  guideImage: { width: "100%", height: "100%" },
  guideDayBadge: { position: "absolute", bottom: 8, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  guideDayText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  guideBody: { padding: 12, gap: 3 },
  guideCityLabel: { fontFamily: "Inter_700Bold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  guideTitle: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  guideFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  guideStops: { fontFamily: "Inter_400Regular", fontSize: 11 },
  skeletonRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  guideSkeletonCard: { flex: 1 },
  placeSkeletonCard: { width: 160 },
  eventSkeleton: { marginHorizontal: 20, marginBottom: 8 },
  eventRow: { marginHorizontal: 20, marginBottom: 8, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  eventDateBox: { width: 54, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventDateText: { fontFamily: "Inter_700Bold", fontSize: 12, textAlign: "center" },
  eventInfo: { flex: 1 },
  hotelCard: { width: 190, borderRadius: 16, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 } }) },
  hotelImageBox: { height: 120, position: "relative" },
  hotelImage: { width: "100%", height: "100%" },
  hotelCatBadge: { position: "absolute", bottom: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  hotelCatText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff", textTransform: "capitalize" },
  hotelBody: { padding: 10, gap: 4 },
  hotelName: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 },
  hotelRatingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  hotelRatingText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  hotelPrice: { fontFamily: "Inter_700Bold", fontSize: 12 },
  eventName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  eventVenue: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  emptyBox: { marginHorizontal: 20, borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  quickJumpScroll: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  quickJumpTile: { width: 76, alignItems: "center", borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, gap: 8 },
  quickJumpIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  quickJumpLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" },
  glanceCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  glanceStat: { width: "45%", flexDirection: "row", alignItems: "flex-start", gap: 10 },
  glanceStatIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  glanceStatText: { flex: 1 },
  glanceStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  glanceStatValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, marginTop: 1 },
  activityCard: { width: 210, borderRadius: 18, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 } }) },
  activityImageBox: { height: 120, position: "relative" },
  activityImage: { width: "100%", height: "100%" },
  activityCatBadge: { position: "absolute", bottom: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  activityCatText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff", textTransform: "capitalize" },
  activityBody: { padding: 12, gap: 6 },
  activityName: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 },
  activityDesc: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
  activityMeta: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  activityMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  activityMetaText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  activityPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  activityPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  activityExploreBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 9 },
  activityExploreTxt: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  dayPlanCard: { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, borderWidth: 1, padding: 14 },
  dayPlanHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  dayPlanTitle: { fontFamily: "Inter_700Bold", fontSize: 14, flex: 1 },
  dayPlanHint: { fontFamily: "Inter_400Regular", fontSize: 11 },
  dayPlanStops: {},
  dayPlanStopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 },
  dayPlanConnector: { alignItems: "center", width: 8, paddingTop: 4 },
  dayPlanDot: { width: 8, height: 8, borderRadius: 4 },
  dayPlanLine: { width: 1, height: 16, marginTop: 2 },
  dayPlanStopName: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, paddingBottom: 14 },
  compactStat: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactStatText: { flex: 1 },
  compactStatLabel: { fontFamily: "Inter_400Regular", fontSize: 10 },
  compactStatValue: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, borderWidth: 1 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.15)", marginBottom: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  modalGlanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  modalTipList: { gap: 10 },
  modalTipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
  modalTipText: { flex: 1 },
  modalTipLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalTipValue: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
});