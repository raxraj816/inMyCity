import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import {
  useGetItineraries,
  useGetPlaces,
  useGetEvents,
  type Itinerary,
  type Place,
  type Event,
} from "@workspace/api-client-react";

// ─── City meta (no Currency — you already know the country) ───

const CITY_META: Record<string, {
  tagline: string;
  tips: { icon: string; label: string; value: string }[];
}> = {
  Mumbai: {
    tagline: "The City of Dreams",
    tips: [
      { icon: "sun",       label: "Best Season",   value: "Nov – Feb"            },
      { icon: "navigation",label: "Getting Around", value: "Metro & Local Trains" },
      { icon: "phone",     label: "Emergency",      value: "112"                  },
    ],
  },
  Bangalore: {
    tagline: "The Garden City",
    tips: [
      { icon: "sun",       label: "Best Season",   value: "Oct – Feb"             },
      { icon: "navigation",label: "Getting Around", value: "Metro & Auto-Rickshaw" },
      { icon: "phone",     label: "Emergency",      value: "112"                   },
    ],
  },
  "New York City": {
    tagline: "The City That Never Sleeps",
    tips: [
      { icon: "sun",       label: "Best Season",   value: "Apr – Jun, Sep – Nov" },
      { icon: "navigation",label: "Getting Around", value: "Subway & Bus"         },
      { icon: "phone",     label: "Emergency",      value: "911"                  },
    ],
  },
  "San Francisco": {
    tagline: "The City by the Bay",
    tips: [
      { icon: "sun",       label: "Best Season",   value: "Sep – Nov"            },
      { icon: "navigation",label: "Getting Around", value: "BART & Muni"          },
      { icon: "phone",     label: "Emergency",      value: "911"                  },
    ],
  },
};

const DEFAULT_META = {
  tagline: "Discover this city",
  tips: [
    { icon: "sun",       label: "Best Season",   value: "Check locally"  },
    { icon: "navigation",label: "Getting Around", value: "Public Transit" },
    { icon: "phone",     label: "Emergency",      value: "Local number"   },
  ],
};

// ─── Place filter pills ────────────────────────────────────────

const PLACE_FILTERS = [
  { id: "all",        label: "All"         },
  { id: "attraction", label: "Attractions" },
  { id: "nightlife",  label: "Nightlife"   },
  { id: "essentials", label: "Essentials"  },
];

// ─── Main Screen ───────────────────────────────────────────────

export default function CityGuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCity, showPicker } = useCity();
  const [placeFilter, setPlaceFilter] = useState("all");

  const cityName = selectedCity?.name;
  const meta = (cityName && CITY_META[cityName]) ?? DEFAULT_META;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: itineraries = [], isLoading: iLoading, error: iError, refetch: iRefetch } =
    useGetItineraries({ city: cityName });
  const { data: allPlaces = [], isLoading: pLoading } =
    useGetPlaces({ city: cityName });
  const { data: events = [], isLoading: eLoading } =
    useGetEvents({ city: cityName });

  if (iError) return <ErrorFallback error={iError as Error} resetError={iRefetch} />;

  const filteredPlaces = (
    placeFilter === "all"
      ? allPlaces
      : allPlaces.filter((p) => p.category?.toLowerCase() === placeFilter)
  ).slice(0, 10);

  const upcomingEvents = events.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>City Guide</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                Everything a visitor needs
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="user" size={17} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.cityBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={showPicker}
            activeOpacity={0.75}
          >
            <Feather name="map-pin" size={13} color={colors.amber} />
            <Text style={[styles.cityBtnText, { color: colors.foreground }]} numberOfLines={1}>
              {selectedCity?.displayName ?? "Select City"}
            </Text>
            <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ── */}
        <View style={[styles.heroBanner, { backgroundColor: colors.navy }]}>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Visiting</Text>
            <Text style={styles.heroCity}>{selectedCity?.displayName ?? "Your City"}</Text>
            <Text style={styles.heroTagline}>{meta.tagline}</Text>
          </View>
          <View style={[styles.heroIconBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Feather name="compass" size={36} color="#f97316" />
          </View>
        </View>

        {/* ── Quick Tips ── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Tips" icon="info" colors={colors} />
          <View style={styles.tipsRow}>
            {meta.tips.map((tip) => (
              <View
                key={tip.label}
                style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.tipIconBox, { backgroundColor: colors.accent }]}>
                  <Feather name={tip.icon as any} size={16} color={colors.amber} />
                </View>
                <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>{tip.label}</Text>
                <Text style={[styles.tipValue, { color: colors.foreground }]}>{tip.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Getting Around CTA ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.transitCard, { backgroundColor: "#06b6d4" }]}
          onPress={() => router.push("/transit")}
        >
          <View style={[styles.transitIconBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <MaterialCommunityIcons name="train-variant" size={22} color="#fff" />
          </View>
          <View style={styles.transitText}>
            <Text style={styles.transitTitle}>Getting Around</Text>
            <Text style={styles.transitSub}>Metro, bus & train routes for visitors</Text>
          </View>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        {/* ── Explore Places ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Explore Places"
            icon="map-pin"
            colors={colors}
            onSeeAll={() => router.push("/places")}
          />

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.placeFilterScroll}
          >
            {PLACE_FILTERS.map((f) => {
              const active = placeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active ? "#6366f1" : colors.card,
                      borderColor: active ? "#6366f1" : colors.border,
                    },
                  ]}
                  onPress={() => setPlaceFilter(f.id)}
                >
                  <Text style={[styles.filterPillText, { color: active ? "#fff" : colors.foreground }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Places horizontal scroll */}
          {pLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
              <SkeletonCard height={180} style={styles.placeSkeletonCard} />
            </View>
          ) : filteredPlaces.length === 0 ? (
            <EmptySection icon="map-pin" message={`No ${placeFilter === "all" ? "places" : placeFilter} in ${cityName ?? "this city"} yet.`} colors={colors} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesScroll}
            >
              {filteredPlaces.map((place) => (
                <PlaceGuideCard
                  key={place.id}
                  place={place}
                  colors={colors}
                  onPress={() => router.push(`/place/${place.id}` as any)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Curated Guides ── */}
        <View style={styles.section}>
          <SectionHeader title="Curated Guides" icon="map" colors={colors} />
          {iLoading ? (
            <View style={styles.skeletonRow}>
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
              <SkeletonCard height={220} style={styles.guideSkeletonCard} />
            </View>
          ) : itineraries.length === 0 ? (
            <EmptySection icon="map" message="No guides available for this city yet." colors={colors} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guidesScroll}>
              {itineraries.map((itin) => (
                <ItineraryGuideCard
                  key={itin.id}
                  itinerary={itin}
                  colors={colors}
                  onPress={() => router.push(`/itinerary/${itin.id}` as any)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Events in the City ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Events in the City"
            icon="calendar"
            colors={colors}
            onSeeAll={() => router.push("/(tabs)/events" as any)}
          />
          {eLoading ? (
            <>
              <SkeletonCard height={80} style={styles.eventSkeleton} />
              <SkeletonCard height={80} style={styles.eventSkeleton} />
            </>
          ) : upcomingEvents.length === 0 ? (
            <EmptySection icon="calendar" message="No upcoming events right now." colors={colors} />
          ) : (
            upcomingEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                colors={colors}
                onPress={() => router.push(`/event/${event.id}` as any)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <CityPicker />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function SectionHeader({
  title, icon, colors, onSeeAll,
}: {
  title: string;
  icon: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onSeeAll?: () => void;
}) {
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

function EmptySection({
  icon, message, colors,
}: {
  icon: string;
  message: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.emptyBox, { backgroundColor: colors.muted }]}>
      <Feather name={icon as any} size={20} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

function PlaceGuideCard({
  place, colors, onPress,
}: {
  place: Place;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
}) {
  const categoryColor =
    place.category === "food"       ? "#f97316"
    : place.category === "attraction" ? "#0ea5e9"
    : place.category === "nightlife"  ? "#ec4899"
    : place.category === "essentials" ? "#10b981"
    : colors.mutedForeground;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.placeImageBox}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.placeImage} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.placeImage, { backgroundColor: colors.muted }]} />
        )}
        <View style={[styles.placeCatBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.placeCatText}>{place.category}</Text>
        </View>
        {place.isOpen !== null && (
          <View style={[styles.openDot, { backgroundColor: place.isOpen ? colors.success : colors.destructive }]} />
        )}
      </View>
      <View style={styles.placeBody}>
        <Text style={[styles.placeName, { color: colors.foreground }]} numberOfLines={2}>
          {place.name}
        </Text>
        {place.rating != null && (
          <View style={styles.placeRating}>
            <Feather name="star" size={11} color="#f59e0b" />
            <Text style={[styles.placeRatingText, { color: colors.mutedForeground }]}>
              {place.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ItineraryGuideCard({
  itinerary, colors, onPress,
}: {
  itinerary: Itinerary;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.guideImageBox}>
        {itinerary.coverImageUrl ? (
          <Image source={{ uri: itinerary.coverImageUrl }} style={styles.guideImage} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.guideImage, { backgroundColor: colors.navy }]} />
        )}
        <View style={[styles.guideDayBadge, { backgroundColor: colors.amber }]}>
          <Text style={styles.guideDayText}>{itinerary.durationDays}d</Text>
        </View>
      </View>
      <View style={styles.guideBody}>
        <Text style={[styles.guideCityLabel, { color: colors.amber }]} numberOfLines={1}>
          {itinerary.city}
        </Text>
        <Text style={[styles.guideTitle, { color: colors.foreground }]} numberOfLines={2}>
          {itinerary.title}
        </Text>
        <View style={styles.guideFooter}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.guideStops, { color: colors.mutedForeground }]}>
            {itinerary.stops?.length ?? 0} stops
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventRow({
  event, colors, onPress,
}: {
  event: Event;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
}) {
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.eventDateBox, { backgroundColor: colors.accent }]}>
        <Text style={[styles.eventDateText, { color: colors.amber }]}>
          {dateStr ?? "—"}
        </Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
          {event.name}
        </Text>
        {event.venue && (
          <Text style={[styles.eventVenue, { color: colors.mutedForeground }]} numberOfLines={1}>
            {event.venue}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  cityBtn: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  cityBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  heroBanner: {
    marginHorizontal: 20, marginBottom: 8, borderRadius: 20,
    padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  heroContent: { flex: 1 },
  heroEyebrow: {
    fontFamily: "Inter_400Regular", fontSize: 12,
    color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1,
  },
  heroCity: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", marginTop: 2 },
  heroTagline: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  heroIconBox: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginLeft: 16,
  },

  section: { marginTop: 8 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  transitCard: {
    marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  transitIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  transitText: { flex: 1 },
  transitTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  transitSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },

  tipsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
  },
  tipCard: {
    flex: 1, borderRadius: 16, padding: 14, borderWidth: 1,
    alignItems: "flex-start", gap: 6,
  },
  tipIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tipLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  tipValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 },

  placeFilterScroll: {
    paddingHorizontal: 20, paddingBottom: 12, gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterPillText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  placesScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },
  placeCard: {
    width: 160, borderRadius: 16, overflow: "hidden", borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    }),
  },
  placeImageBox: { height: 110, position: "relative" },
  placeImage: { width: "100%", height: "100%" },
  placeCatBadge: {
    position: "absolute", bottom: 8, left: 8,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  placeCatText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff", textTransform: "capitalize" },
  openDot: {
    position: "absolute", top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
  },
  placeBody: { padding: 10, gap: 5 },
  placeName: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  placeRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  placeRatingText: { fontFamily: "Inter_500Medium", fontSize: 11 },

  guidesScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },
  guideCard: {
    width: 220, borderRadius: 18, overflow: "hidden", borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
    }),
  },
  guideImageBox: { height: 130, position: "relative" },
  guideImage: { width: "100%", height: "100%" },
  guideDayBadge: {
    position: "absolute", bottom: 8, left: 10,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  guideDayText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  guideBody: { padding: 12, gap: 3 },
  guideCityLabel: { fontFamily: "Inter_700Bold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  guideTitle: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  guideFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  guideStops: { fontFamily: "Inter_400Regular", fontSize: 11 },

  eventRow: {
    marginHorizontal: 20, marginBottom: 8, borderRadius: 14, borderWidth: 1,
    flexDirection: "row", alignItems: "center", padding: 12, gap: 12,
  },
  eventDateBox: {
    width: 54, height: 54, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  eventDateText: { fontFamily: "Inter_700Bold", fontSize: 12, textAlign: "center" },
  eventInfo: { flex: 1 },
  eventName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  eventVenue: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  skeletonRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  guideSkeletonCard: { flex: 1 },
  placeSkeletonCard: { width: 160 },
  eventSkeleton: { marginHorizontal: 20, marginBottom: 8 },

  emptyBox: {
    marginHorizontal: 20, borderRadius: 14, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
});
