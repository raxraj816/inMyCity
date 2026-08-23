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
import { ErrorState, useListRefreshControl } from "@/components/ListStates";
import { AppHeader } from "@/components/AppHeader";
import { AiChatFab } from "@/components/AiChatFab";
import {
  getGetCityGuideQueryKey,
  useGetCityGuide,
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
import { MUMBAI_LAUNCH_ZONES, currencyFor, formatPriceForCity } from "@workspace/city-config";

const PLACE_FILTERS = [
  { id: "all", label: "All" },
  { id: "attraction", label: "Attractions" },
  { id: "nightlife", label: "Nightlife" },
  { id: "essentials", label: "Essentials" },
  { id: "wellness", label: "Spa & Salons" },
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
  { id: "morning",   label: "Morning",   icon: "sunrise",  color: "#b45309", hint: "Before noon",   categories: ["wellness", "sports", "tour"] },
  { id: "afternoon", label: "Afternoon", icon: "sun",      color: "#c2410c", hint: "12 pm – 6 pm",  categories: ["cultural", "adventure", "tours"] },
  { id: "evening",   label: "Evening",   icon: "moon",     color: "#4f46e5", hint: "After 6 pm",    categories: ["nightlife", "workshop"] },
];

const GUIDE_FILTERS = [
  { id: "all", label: "All" },
  { id: "1", label: "1 Day" },
  { id: "2", label: "2 Days" },
  { id: "3", label: "3 Days" },
  { id: "4", label: "4 Days" },
];

/**
 * Neighbourhoods, insider tips and city facts used to be four constants keyed by city name in
 * this file. The tips and facts are rows now — `GET /city-guide` returns them, so a wrong
 * emergency number is an edit rather than a release — and neighbourhoods come from
 * `MUMBAI_LAUNCH_ZONES`, which was always the better source and is now the only one.
 *
 * Currency is resolved by `currencyFor`. It is never stored or written into copy: the old
 * `CITY_AT_A_GLANCE` hardcoded "INR (₹)" per city, which is exactly how a Mumbai row ends up
 * priced in dollars.
 */
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
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: cityGuide } = useGetCityGuide(
    { city: cityName ?? "" },
    { query: { enabled: Boolean(cityName), queryKey: getGetCityGuideQueryKey({ city: cityName ?? "" }) } },
  );

  const facts = cityGuide?.facts ?? [];
  const insiderTips = cityGuide?.insiderTips ?? [];
  const factValue = (label: string) => facts.find((fact) => fact.label === label)?.value;
  const tagline = cityGuide?.tagline ?? "Discover this city";
  // The one fact that is computed rather than stored, so it can never disagree with a price.
  const currency = currencyFor(cityName);
  const currencyLabel = `${currency.code} (${currency.symbol})`;

  const { data: itineraries = [], isLoading: iLoading, isRefetching: iRefetching,
    error: iError, refetch: iRefetch } = useGetItineraries({ city: cityName });
  const { data: allPlaces = [], isLoading: pLoading } = useGetPlaces({ city: cityName });
  const { data: events = [], isLoading: eLoading } = useGetEvents({ city: cityName });
  const { data: allHotels = [], isLoading: hLoading } = useGetHotels({ city: cityName });
  const { data: activities = [], isLoading: actLoading } = useGetActivities({ city: cityName });

  const refreshControl = useListRefreshControl(iRefetching, iRefetch);


  const filteredPlaces = (
    placeFilter === "all" ? allPlaces : allPlaces.filter((p) => p.category?.toLowerCase() === placeFilter)
  ).slice(0, 10);
  const upcomingEvents = events.slice(0, 5);
  const neighborhoods =
    cityName === "Mumbai"
      ? MUMBAI_LAUNCH_ZONES.map((zone, index) => ({
          id: zone.id,
          name: zone.name,
          vibe: zone.vibe,
          color: ["#be185d", "#0369a1", "#b45309", "#047857", "#4f46e5", "#dc2626"][index % 6],
        }))
      : [];
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={refreshControl}
      >
        <AppHeader subtitle="Your Visitor's Guide" topPadding={topPadding} showCityPicker />

        {/* The guide is mostly curated content that renders without the server. Only the
            itineraries section depends on it, so a failure is reported in place. */}
        {iError ? <ErrorState error={iError} onRetry={iRefetch} subject="city guides" /> : null}

        <View style={[styles.heroBanner, { backgroundColor: colors.navy }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Visiting</Text>
              <Text style={styles.heroCity}>{selectedCity?.displayName ?? "Your City"}</Text>
              <Text style={styles.heroTagline}>{tagline}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.heroInfoButton, { backgroundColor: "rgba(249,115,22,0.16)", borderColor: "rgba(249,115,22,0.34)" }]}
              onPress={() => setDetailsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open Mumbai city details"
            >
              <MaterialCommunityIcons name="star-four-points" size={20} color="#fb923c" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroDivider} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroFactsScroll}>
            {[
              { icon: "sun", label: "Best season", value: factValue("Best Season") ?? "Check locally" },
              { icon: "navigation", label: "Transit", value: factValue("Getting Around") ?? "Public transit" },
              { icon: "clock", label: "Timezone", value: cityGuide?.timezoneLabel ?? "Local time" },
              { icon: "calendar", label: "Trip length", value: cityGuide?.tripLength ?? "2–4 days" },
              { icon: "credit-card", label: "Currency", value: currencyLabel },
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

        </View>

        {neighborhoods.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Neighborhoods" icon="map" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.neighborhoodsScroll}>
              {neighborhoods.map((hood) => (
                <TouchableOpacity
                  key={hood.name}
                  activeOpacity={0.8}
                  style={[styles.neighborhoodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(hood.id ? `/neighborhood/${hood.id}` as any : "/places")}
                >
                  <View style={[styles.neighborhoodDot, { backgroundColor: hood.color }]} />
                  <Text style={[styles.neighborhoodName, { color: colors.foreground }]}>{hood.name}</Text>
                  <Text style={[styles.neighborhoodVibe, { color: colors.mutedForeground }]}>{hood.vibe}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {insiderTips.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Insider tips" icon="zap" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insiderScroll}>
              {insiderTips.map((tip) => (
                <TouchableOpacity
                  key={tip.id}
                  activeOpacity={tip.neighborhoodId ? 0.85 : 1}
                  disabled={!tip.neighborhoodId}
                  onPress={() => tip.neighborhoodId && router.push(`/neighborhood/${tip.neighborhoodId}` as any)}
                  style={[styles.insiderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  accessibilityRole={tip.neighborhoodId ? "button" : "text"}
                  accessibilityLabel={`${tip.label}. ${tip.tip}`}
                >
                  <View style={[styles.insiderIcon, { backgroundColor: tip.color + "18" }]}>
                    <Feather name={tip.icon as any} size={14} color={tip.color} />
                  </View>
                  <Text style={[styles.insiderLabel, { color: tip.color }]}>{tip.label}</Text>
                  <Text style={[styles.insiderText, { color: colors.foreground }]}>{tip.tip}</Text>
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
                  style={[styles.audiencePill, { backgroundColor: active ? "#dc2626" : colors.card, borderColor: active ? "#dc2626" : colors.border }]}
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
                    style={[styles.durationPill, { backgroundColor: active ? "#0369a1" : colors.muted, borderColor: active ? "#0369a1" : "transparent" }]}
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
          <View style={[styles.freeSection, { backgroundColor: "#047857" + "12", borderColor: "#04785733" }]}>
            <View style={styles.freeSectionHeader}>
              <View style={[styles.freeIconBox, { backgroundColor: "#047857" }]}>
                <Feather name="gift" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freeSectionTitle, { color: colors.foreground }]}>Free Experiences</Text>
                <Text style={[styles.freeSectionSub, { color: colors.mutedForeground }]}>Explore {cityName ?? "the city"} at no cost</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/activities")}>
                <Text style={[styles.seeAll, { color: "#047857" }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freeScroll}>
              {freeActivities.map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.freeCard, { backgroundColor: colors.card, borderColor: "#04785733" }]}
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
                      <View style={[styles.freeBadge, { backgroundColor: "#047857" }]}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                      {act.rating != null && (
                        <View style={styles.freeRating}>
                          <Feather name="star" size={10} color="#b45309" />
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
                  style={[styles.filterPill, { backgroundColor: active ? "#4f46e5" : colors.card, borderColor: active ? "#4f46e5" : colors.border }]}
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
                  style={[styles.guideFilterPill, { backgroundColor: active ? "#4f46e5" : colors.card, borderColor: active ? "#4f46e5" : colors.border }]}
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
                    style={[styles.sortMenuRow, { backgroundColor: selected ? "#dc2626" + "15" : colors.muted, borderColor: selected ? "#dc2626" : colors.border }]}
                    onPress={() => { setActivitySort(opt.id); setSortMenuOpen(false); }}
                  >
                    <Text style={[styles.sortMenuLabel, { color: selected ? "#dc2626" : colors.foreground }]}>{opt.label}</Text>
                    {selected && <Feather name="check" size={16} color="#dc2626" />}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mumbai Starter Guide</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalIntro, { color: colors.mutedForeground }]}>
              First-time context, transit basics, rain backups, food areas, and city details in one place.
            </Text>
            <View style={styles.modalStarterList}>
              {[
                { icon: "compass", title: "First time in Mumbai", body: "Start with one neighborhood, one meal plan, and one transit anchor instead of trying to cross the whole city." },
                { icon: "navigation", title: "Local train basics", body: "Use Western, Central, and Harbour lines for longer movement. Avoid peak crush hours when possible." },
                { icon: "cloud-rain", title: "Rain-safe guide", body: "Keep indoor backups for monsoon days: cafes, malls, museums, movies, and station-adjacent plans." },
                { icon: "coffee", title: "Food zones", body: "Bandra, Fort, Dadar, Ghatkopar, Juhu, and Colaba each solve a different food mood." },
                { icon: "shield", title: "Safety/context", body: "Mumbai is active late, but plan clear pickup points, watch crowded markets, and keep a rain/traffic buffer." },
              ].map((item) => (
                <View key={item.title} style={[styles.modalStarterRow, { backgroundColor: colors.muted }]}>
                  <View style={[styles.modalStarterIcon, { backgroundColor: colors.amber + "18" }]}>
                    <Feather name={item.icon as any} size={14} color={colors.amber} />
                  </View>
                  <View style={styles.modalStarterText}>
                    <Text style={[styles.modalStarterTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.modalStarterBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.modalGlanceGrid}>
              <GlanceStat icon="credit-card" label="Currency" value={currencyLabel} colors={colors} />
              <GlanceStat icon="clock" label="Timezone" value={cityGuide?.timezoneLabel ?? "Local time"} colors={colors} />
              <GlanceStat icon="trending-up" label="Known For" value={cityGuide?.knownFor ?? "Discover & explore"} colors={colors} />
              <GlanceStat icon="calendar" label="Best Trip" value={cityGuide?.tripLength ?? "2–4 days"} colors={colors} />
            </View>
            <View style={styles.modalTipList}>
              {facts.slice(0, 6).map((fact) => (
                <View key={fact.id} style={[styles.modalTipRow, { borderBottomColor: colors.border }]}>
                  <Feather name={fact.icon as any} size={14} color={colors.amber} />
                  <View style={styles.modalTipText}>
                    <Text style={[styles.modalTipLabel, { color: colors.foreground }]}>{fact.label}</Text>
                    <Text style={[styles.modalTipValue, { color: colors.mutedForeground }]}>{fact.value}</Text>
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
  const categoryColor = place.category === "food" ? "#c2410c" : place.category === "attraction" ? "#0369a1" : place.category === "nightlife" ? "#be185d" : place.category === "essentials" ? "#047857" : place.category === "wellness" ? "#0e7490" : colors.mutedForeground;
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
            <Feather name="star" size={11} color="#b45309" />
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
  budget: "#047857",
  "mid-range": "#0369a1",
  luxury: "#b45309",
  boutique: "#be185d",
};

function HotelGuideCard({ hotel, colors, onPress }: { hotel: Hotel; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; onPress: () => void; }) {
  const catColor = HOTEL_CAT_COLORS[hotel.category] ?? colors.mutedForeground;

  const priceStr = hotel.pricePerNight != null
    ? `${formatPriceForCity(hotel.pricePerNight, hotel.city, hotel.currency)}/night`
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
            <Feather name="star" size={11} color="#b45309" />
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

function ActivityCard({ activity, colors, sort }: { activity: Activity; colors: ReturnType<typeof import("@/hooks/useColors").useColors>; sort?: string; }) {
  const router = useRouter();

  const isFree = !activity.price || activity.price === 0;
  const priceStr = isFree
    ? "Free"
    : formatPriceForCity(activity.price!, activity.city, activity.currency);
  const durationStr = activity.durationMinutes != null
    ? activity.durationMinutes >= 60
      ? `${Math.floor(activity.durationMinutes / 60)}h${activity.durationMinutes % 60 > 0 ? ` ${activity.durationMinutes % 60}m` : ""}`
      : `${activity.durationMinutes}m`
    : null;
  const catColors: Record<string, string> = {
    tours: "#4f46e5", cultural: "#be185d", sports: "#047857",
    fitness: "#c2410c", adventure: "#0369a1", wellness: "#7c3aed",
    tour: "#be185d", workshop: "#b45309",
  };
  const catColor = catColors[activity.category] ?? "#4f46e5";
  const isTopRated = (activity.rating ?? 0) >= 4.5;
  const badge = isFree
    ? { label: "FREE", bg: "#047857" }
    : isTopRated
    ? { label: "TOP RATED", bg: "#b45309" }
    : null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/activity/${activity.id}` as any)}
    >
      <View style={styles.activityImageBox}>
        {activity.imageUrl
          ? <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} contentFit="cover" transition={200} />
          : <View style={[styles.activityImage, { backgroundColor: colors.muted }]} />}
        <View style={[styles.activityCatBadge, { backgroundColor: catColor }]}>
          <Text style={styles.activityCatText}>{activity.category}</Text>
        </View>
        {badge && (
          <View style={[styles.activityBadge, { backgroundColor: badge.bg }]}>
            <Text style={styles.activityBadgeText}>{badge.label}</Text>
          </View>
        )}
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
              <Feather name="star" size={11} color="#b45309" />
              <Text style={[styles.activityMetaText, { color: colors.mutedForeground }]}>{activity.rating.toFixed(1)}</Text>
              {activity.reviewCount != null && (
                <Text style={[styles.activityMetaText, { color: colors.mutedForeground }]}>({activity.reviewCount.toLocaleString()})</Text>
              )}
            </View>
          )}
        </View>
        <View style={[styles.activityPriceRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.activityPrice, { color: isFree ? "#047857" : colors.amber }]}>{priceStr}</Text>
          <View style={[styles.activityExploreBtn, { backgroundColor: catColor }]}>
            <Text style={styles.activityExploreTxt}>Explore</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  heroInfoButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 12, ...Platform.select({ web: { boxShadow: "0 0 18px rgba(249,115,22,0.16)" }, default: { shadowColor: "#c2410c", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 2 } }) },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 14 },
  heroFactsScroll: { gap: 8, paddingBottom: 2 },
  heroFactPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12 },
  heroFactLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.3 },
  heroFactValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff", marginTop: 1 },
  section: { marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  guideFilterScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  guideFilterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  guideFilterText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  tipsScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 10 },
  tipCard: { width: 130, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 6 },
  tipIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tipLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  tipValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 },
  neighborhoodsScroll: { paddingHorizontal: 20, gap: 10 },
  insiderScroll: { paddingHorizontal: 20, gap: 10 },
  insiderCard: { width: 268, borderRadius: 16, borderWidth: 1, padding: 14, gap: 7 },
  insiderIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  insiderLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 },
  insiderText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
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
  modalIntro: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 14 },
  modalStarterList: { gap: 10, marginBottom: 14 },
  modalStarterRow: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 12 },
  modalStarterIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  modalStarterText: { flex: 1 },
  modalStarterTitle: { fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 3 },
  modalStarterBody: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  modalGlanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  modalTipList: { gap: 10 },
  modalTipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
  modalTipText: { flex: 1 },
  modalTipLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalTipValue: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },

  activityBadge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  activityBadgeText: { fontFamily: "Inter_700Bold", fontSize: 8, color: "#fff", letterSpacing: 0.5 },

  audienceScroll: { paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  audiencePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  audiencePillText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  actFilterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  durationScroll: { gap: 6 },
  durationPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  durationPillText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  sortBtnText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  sortMenuRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  sortMenuLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  freeSection: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 18, borderWidth: 1, paddingTop: 14, paddingBottom: 14 },
  freeSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 12 },
  freeIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  freeSectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  freeSectionSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  freeScroll: { paddingHorizontal: 14, gap: 10 },
  freeCard: { width: 140, borderRadius: 14, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 } }) },
  freeCardImg: { width: "100%", height: 90 },
  freeCardBody: { padding: 8, gap: 5 },
  freeCardName: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  freeCardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  freeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  freeBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff", letterSpacing: 0.3 },
  freeRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  freeRatingText: { fontFamily: "Inter_500Medium", fontSize: 10 },

  todTabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  todTab: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  todTabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  todTabHint: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 1 },
});
