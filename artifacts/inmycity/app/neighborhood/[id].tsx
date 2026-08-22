import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  MUMBAI_LAUNCH_ZONES,
  type MumbaiLaunchZone,
} from "@workspace/city-config";
import {
  useGetActivities,
  useGetDeals,
  useGetEvents,
  useGetPlaces,
  type Activity,
  type Deal,
  type Event,
  type Place,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import {
  buildPlanShareText,
  isPlanSaved,
  toggleSavedPlan,
  type SavedPlan,
} from "@/lib/savedPlans";

type PickItem = {
  id: string;
  type: "place" | "event" | "deal" | "activity";
  title: string;
  meta: string;
  imageUrl?: string | null;
  route: string;
  color: string;
  icon: keyof typeof Feather.glyphMap;
};

const ZONE_COLORS = [
  "#be185d",
  "#0369a1",
  "#b45309",
  "#047857",
  "#4f46e5",
  "#dc2626",
] as const;

const DEFAULT_ZONE_IMAGE =
  "https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=1200";

function priceLabel(priceBand: MumbaiLaunchZone["priceBand"]) {
  const labels: Record<MumbaiLaunchZone["priceBand"], string> = {
    free: "Free-friendly",
    budget: "Budget-friendly",
    mid: "Mid-range",
    premium: "Premium",
    mixed: "Mixed budgets",
  };
  return labels[priceBand];
}

function wordsForZone(zone: MumbaiLaunchZone) {
  return [
    zone.name,
    zone.id.replace(/-/g, " "),
    ...zone.bestFor,
    ...zone.vibe.split(","),
  ]
    .map((word) => word.toLowerCase().trim())
    .filter((word) => word.length > 2);
}

function textIncludesZone(text: string, zone: MumbaiLaunchZone) {
  const haystack = text.toLowerCase();
  return wordsForZone(zone).some((word) => haystack.includes(word));
}

function pickRelevant<T>(items: T[], zone: MumbaiLaunchZone, toText: (item: T) => string, limit: number) {
  const matches = items.filter((item) => textIncludesZone(toText(item), zone));
  return (matches.length > 0 ? matches : items).slice(0, limit);
}

function buildPlan(zone: MumbaiLaunchZone): Omit<SavedPlan, "createdAt"> {
  return {
    id: `neighborhood-${zone.id}`,
    kind: "neighborhood",
    title: `${zone.name} first-time plan`,
    subtitle: `${zone.vibe}. Best ${zone.bestTime}.`,
    city: "Mumbai",
    route: `/neighborhood/${zone.id}`,
    summary: `${zone.transitAccess}. ${zone.monsoonNote}`,
  };
}

function buildFirstVisitFlow(zone: MumbaiLaunchZone) {
  return [
    {
      title: "Arrive with a clear anchor",
      body: `Use ${zone.transitAccess} and pick one meetup point before you start.`,
      icon: "navigation" as const,
    },
    {
      title: `Start with ${zone.bestFor[0] ?? "the neighborhood highlight"}`,
      body: `This area is strongest for ${zone.bestFor.join(", ")}.`,
      icon: "map-pin" as const,
    },
    {
      title: "Keep one backup ready",
      body: zone.monsoonNote,
      icon: "cloud-rain" as const,
    },
    {
      title: "Leave with low friction",
      body: zone.safetyContext,
      icon: "shield" as const,
    },
  ];
}

function ItemCard({ item, colors }: { item: PickItem; colors: ReturnType<typeof useColors> }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.pickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.imageUrl ?? DEFAULT_ZONE_IMAGE }}
        style={styles.pickImage}
        contentFit="cover"
      />
      <View style={styles.pickBody}>
        <View style={[styles.pickBadge, { backgroundColor: item.color + "18" }]}>
          <Feather name={item.icon} size={11} color={item.color} />
          <Text style={[styles.pickBadgeText, { color: item.color }]}>{item.type}</Text>
        </View>
        <Text style={[styles.pickTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.pickMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.meta}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NeighborhoodGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);

  const zone = MUMBAI_LAUNCH_ZONES.find((item) => item.id === id);

  const { data: places = [] } = useGetPlaces({ city: "Mumbai" });
  const { data: events = [] } = useGetEvents({ city: "Mumbai" });
  const { data: deals = [] } = useGetDeals({ city: "Mumbai" });
  const { data: activities = [] } = useGetActivities({ city: "Mumbai" });

  useEffect(() => {
    if (!zone) return;
    isPlanSaved(`neighborhood-${zone.id}`).then(setSaved).catch(() => setSaved(false));
  }, [zone]);

  const picks = useMemo<PickItem[]>(() => {
    if (!zone) return [];

    const placePicks = pickRelevant<Place>(
      places,
      zone,
      (place) => [place.name, place.address, place.category, place.description, place.tags.join(" ")].join(" "),
      3,
    ).map((place) => ({
      id: `place-${place.id}`,
      type: "place" as const,
      title: place.name,
      meta: `${place.category}${place.rating ? ` · ${place.rating.toFixed(1)}` : ""}`,
      imageUrl: place.imageUrl,
      route: `/place/${place.id}`,
      color: "#0369a1",
      icon: "map-pin" as const,
    }));

    const activityPicks = pickRelevant<Activity>(
      activities,
      zone,
      (activity) => [activity.name, activity.address, activity.category, activity.description, activity.tags.join(" ")].join(" "),
      2,
    ).map((activity) => ({
      id: `activity-${activity.id}`,
      type: "activity" as const,
      title: activity.name,
      meta: activity.price ? `Rs ${activity.price}` : "Free or low-cost",
      imageUrl: activity.imageUrl,
      route: `/activity/${activity.id}`,
      color: "#dc2626",
      icon: "zap" as const,
    }));

    const eventPicks = pickRelevant<Event>(
      events,
      zone,
      (event) => [event.title, event.venue, event.address, event.category, event.description, event.tags.join(" ")].join(" "),
      2,
    ).map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      title: event.title,
      meta: event.isFree ? "Free event" : event.venue,
      imageUrl: event.imageUrl,
      route: `/event/${event.id}`,
      color: "#7c3aed",
      icon: "calendar" as const,
    }));

    const dealPicks = pickRelevant<Deal>(
      deals,
      zone,
      (deal) => [deal.title, deal.placeName, deal.category, deal.description].join(" "),
      2,
    ).map((deal) => ({
      id: `deal-${deal.id}`,
      type: "deal" as const,
      title: deal.title,
      meta: deal.discountText,
      imageUrl: deal.imageUrl,
      route: `/deal/${deal.id}`,
      color: "#047857",
      icon: "percent" as const,
    }));

    return [...placePicks, ...activityPicks, ...eventPicks, ...dealPicks].slice(0, 8);
  }, [activities, deals, events, places, zone]);

  if (!zone) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Neighborhood not found</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.amber }]} onPress={() => router.replace("/cityguide")}>
          <Text style={styles.primaryButtonText}>Back to City Guide</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const zoneIndex = MUMBAI_LAUNCH_ZONES.findIndex((item) => item.id === zone.id);
  const accent = ZONE_COLORS[zoneIndex % ZONE_COLORS.length];
  const topPadding = Platform.OS === "web" ? 18 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 32 : insets.bottom + 32;
  const plan = buildPlan(zone);
  const firstVisitFlow = buildFirstVisitFlow(zone);

  const onToggleSave = async () => {
    const result = await toggleSavedPlan(plan);
    setSaved(result.saved);
  };

  const onShare = () => {
    Share.share({
      title: plan.title,
      message: buildPlanShareText(plan),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.navy }]}>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.circleButton} onPress={() => router.back()} activeOpacity={0.8}>
              <Feather name="arrow-left" size={21} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.circleButton} onPress={onToggleSave} activeOpacity={0.8}>
                <Feather name={saved ? "bookmark" : "bookmark"} size={19} color={saved ? accent : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleButton} onPress={onShare} activeOpacity={0.8}>
                <Feather name="share-2" size={19} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={[styles.eyebrow, { color: accent }]}>Mumbai neighborhood guide</Text>
            <Text style={styles.heroTitle}>{zone.name}</Text>
            <Text style={styles.heroSubtitle}>{zone.vibe}</Text>
            <View style={styles.chipRow}>
              {zone.bestFor.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.factGrid}>
            {[
              { icon: "navigation", label: "Transit", value: zone.transitAccess },
              { icon: "clock", label: "Best time", value: zone.bestTime },
              { icon: "credit-card", label: "Budget", value: priceLabel(zone.priceBand) },
              { icon: "cloud-rain", label: "Weather backup", value: zone.monsoonNote },
            ].map((fact) => (
              <View key={fact.label} style={[styles.factCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={fact.icon as keyof typeof Feather.glyphMap} size={16} color={accent} />
                <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{fact.label}</Text>
                <Text style={[styles.factValue, { color: colors.foreground }]}>{fact.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.actionPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.amber }]} onPress={onToggleSave} activeOpacity={0.85}>
              <Feather name={saved ? "check" : "bookmark"} size={15} color="#fff" />
              <Text style={styles.actionButtonText}>{saved ? "Saved" : "Save plan"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={onShare} activeOpacity={0.85}>
              <Feather name="share-2" size={15} color={colors.foreground} />
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => router.push("/transit")} activeOpacity={0.85}>
              <Feather name="navigation" size={15} color={colors.foreground} />
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Route</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Feather name="compass" size={17} color={accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>First time in {zone.name}?</Text>
            </View>
            <Text style={[styles.sectionIntro, { color: colors.mutedForeground }]}>
              Start with one clear anchor, keep travel simple, and use the rain backup if Mumbai weather flips.
            </Text>

            <View style={styles.flowList}>
              {firstVisitFlow.map((step, index) => (
                <View key={step.title} style={styles.flowItem}>
                  <View style={[styles.flowNumber, { backgroundColor: accent + "18" }]}>
                    <Text style={[styles.flowNumberText, { color: accent }]}>{index + 1}</Text>
                  </View>
                  <View style={[styles.flowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.flowTitleRow}>
                      <Feather name={step.icon} size={14} color={accent} />
                      <Text style={[styles.flowTitle, { color: colors.foreground }]}>{step.title}</Text>
                    </View>
                    <Text style={[styles.flowBody, { color: colors.mutedForeground }]}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Feather name="map" size={17} color={accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby picks</Text>
            </View>
            {picks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Curated picks are coming</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  The guide is ready. Add more Mumbai content to make this zone richer.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picksScroll}>
                {picks.map((item) => (
                  <ItemCard key={item.id} item={item} colors={colors} />
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            style={[styles.cityPilotCard, { backgroundColor: colors.navy }]}
            onPress={() => router.push("/ai-chat" as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.cityPilotIcon, { backgroundColor: accent }]}>
              <Feather name="zap" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cityPilotTitle}>Ask CityPilot for a {zone.name} plan</Text>
              <Text style={styles.cityPilotSub}>Good for date nights, budget plans, rain-safe options, or a first visit.</Text>
            </View>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    lineHeight: 42,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 620,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  heroChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  factCard: {
    width: "48.5%",
    minHeight: 132,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  factLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  factValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  actionPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 21,
  },
  sectionIntro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  flowList: {
    gap: 10,
  },
  flowItem: {
    flexDirection: "row",
    gap: 10,
  },
  flowNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },
  flowNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  flowCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  flowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  flowTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  flowBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  picksScroll: {
    gap: 12,
    paddingRight: 20,
  },
  pickCard: {
    width: 210,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  pickImage: {
    width: "100%",
    height: 104,
  },
  pickBody: {
    padding: 12,
    gap: 8,
  },
  pickBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  pickTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  pickMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  cityPilotCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cityPilotIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cityPilotTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  cityPilotSub: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  notFoundTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
