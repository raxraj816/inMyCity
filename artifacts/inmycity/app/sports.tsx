import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetActivities, useGetEvents } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EventCard } from "@/components/EventCard";
import { ErrorFallback } from "@/components/ErrorFallback";

type SportsTab = "fitness" | "courts" | "outdoor" | "live";

const TABS: { id: SportsTab; label: string; mciIcon: string }[] = [
  { id: "fitness", label: "Fitness",      mciIcon: "dumbbell"       },
  { id: "courts",  label: "Courts",       mciIcon: "tennis"         },
  { id: "outdoor", label: "Outdoor",      mciIcon: "run-fast"       },
  { id: "live",    label: "Live Sports",  mciIcon: "flag-checkered" },
];

const TAB_COLOR: Record<SportsTab, string> = {
  fitness: "#ef4444",
  courts:  "#f97316",
  outdoor: "#22c55e",
  live:    "#8b5cf6",
};

const FITNESS_FILTERS = [
  { id: "all",      label: "All"      },
  { id: "gym",      label: "Gym"      },
  { id: "yoga",     label: "Yoga"     },
  { id: "crossfit", label: "CrossFit" },
  { id: "swimming", label: "Swimming" },
];

const COURTS_FILTERS = [
  { id: "all",        label: "All"        },
  { id: "cricket",    label: "Cricket"    },
  { id: "badminton",  label: "Badminton"  },
  { id: "tennis",     label: "Tennis"     },
  { id: "football",   label: "Football"   },
  { id: "basketball", label: "Basketball" },
];

export default function SportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [activeTab, setActiveTab]       = useState<SportsTab>("fitness");
  const [fitnessFilter, setFitnessFilter] = useState("all");
  const [courtsFilter,  setCourtsFilter]  = useState("all");

  const topPadding   = Math.max(insets.top, Platform.OS === "web" ? 20 : insets.top);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const cityName = selectedCity?.name;
  const isLocal  = cityName === "Mumbai" || cityName === "Bangalore";
  const currSymbol = isLocal ? "₹" : "$";

  const { data: fitnessData  = [], isLoading: fitnessLoading, error: fitnessError, refetch: refetchFitness } =
    useGetActivities({ city: cityName, category: "fitness" });
  const { data: courtsData   = [], isLoading: courtsLoading,  error: courtsError,  refetch: refetchCourts  } =
    useGetActivities({ city: cityName, category: "sports"  });
  const { data: outdoorData  = [], isLoading: outdoorLoading, error: outdoorError, refetch: refetchOutdoor } =
    useGetActivities({ city: cityName, category: "outdoor" });
  const { data: liveEvents   = [], isLoading: liveLoading,   error: liveError,    refetch: refetchLive    } =
    useGetEvents({ city: cityName, category: "sports" });

  const filteredFitness = fitnessFilter === "all"
    ? fitnessData
    : fitnessData.filter(a => a.tags?.some(t => t.toLowerCase().includes(fitnessFilter)));

  const filteredCourts = courtsFilter === "all"
    ? courtsData
    : courtsData.filter(a => a.tags?.some(t => t.toLowerCase().includes(courtsFilter)));

  const currentError =
    activeTab === "fitness" ? fitnessError :
    activeTab === "courts"  ? courtsError  :
    activeTab === "outdoor" ? outdoorError : liveError;

  const currentRefetch =
    activeTab === "fitness" ? refetchFitness :
    activeTab === "courts"  ? refetchCourts  :
    activeTab === "outdoor" ? refetchOutdoor : refetchLive;

  if (currentError) {
    return <ErrorFallback error={currentError as Error} resetError={currentRefetch} />;
  }

  const tabColor = TAB_COLOR[activeTab];

  const renderActivityCard = (item: typeof fitnessData[number]) => (
    <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
      ) : null}
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {item.durationMinutes ? (
            <View style={styles.metaChip}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item.durationMinutes < 60
                  ? `${item.durationMinutes}min`
                  : `${Math.floor(item.durationMinutes / 60)}h`}
              </Text>
            </View>
          ) : null}
          {item.price !== null && item.price !== undefined ? (
            <View style={styles.metaChip}>
              <Feather name="tag" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item.price === 0 ? "Free" : `${currSymbol}${item.price}`}
              </Text>
            </View>
          ) : null}
          {item.rating ? (
            <View style={styles.metaChip}>
              <Feather name="star" size={11} color="#f59e0b" />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
        {item.openingHours ? (
          <Text style={[styles.cardHours, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.openingHours}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderEmpty = (icon: string, title: string, subtitle: string) => (
    <View style={styles.emptyWrap}>
      <MaterialCommunityIcons name={icon as any} size={44} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === "live") {
      if (liveLoading) return (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {[160, 160, 160].map((h, i) => <SkeletonCard key={i} height={h} />)}
        </View>
      );
      if (!liveEvents.length) {
        return renderEmpty(
          "flag-checkered",
          "No live sports events",
          cityName
            ? `Check back for matches, marathons and tournaments in ${cityName}.`
            : "Select a city to see upcoming sports events.",
        );
      }
      return (
        <FlatList
          data={liveEvents}
          keyExtractor={item => `live-${item.id}`}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    const isLoading = activeTab === "fitness" ? fitnessLoading
      : activeTab === "courts" ? courtsLoading : outdoorLoading;
    const items     = activeTab === "fitness" ? filteredFitness
      : activeTab === "courts" ? filteredCourts : outdoorData;
    const emptyIcon = activeTab === "fitness" ? "dumbbell"
      : activeTab === "courts" ? "tennis" : "run-fast";
    const emptyMsg  = activeTab === "fitness" ? "No fitness venues found"
      : activeTab === "courts" ? "No courts or venues found" : "No outdoor routes found";

    if (isLoading) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {[150, 150, 150].map((h, i) => <SkeletonCard key={i} height={h} />)}
        </View>
      );
    }
    if (!items.length) {
      return renderEmpty(
        emptyIcon,
        emptyMsg,
        cityName
          ? `No ${activeTab} options in ${cityName} yet.`
          : "Select a city to get started.",
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={item => `${activeTab}-${item.id}`}
        renderItem={({ item }) => renderActivityCard(item)}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sports & Fitness" topPadding={topPadding} />

      {/* Main tab pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabRow, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabRowContent}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const tc = TAB_COLOR[tab.id];
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabPill,
                {
                  backgroundColor: active ? tc : colors.card,
                  borderColor: active ? tc : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={tab.mciIcon as any}
                size={14}
                color={active ? "#fff" : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, { color: active ? "#fff" : colors.mutedForeground }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sub-filters */}
      {activeTab === "fitness" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterContent}
        >
          {FITNESS_FILTERS.map(f => {
            const active = fitnessFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.subPill,
                  {
                    backgroundColor: active ? tabColor + "20" : colors.muted,
                    borderColor: active ? tabColor : "transparent",
                  },
                ]}
                onPress={() => setFitnessFilter(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subPillText, { color: active ? tabColor : colors.mutedForeground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {activeTab === "courts" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterContent}
        >
          {COURTS_FILTERS.map(f => {
            const active = courtsFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.subPill,
                  {
                    backgroundColor: active ? tabColor + "20" : colors.muted,
                    borderColor: active ? tabColor : "transparent",
                  },
                ]}
                onPress={() => setCourtsFilter(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subPillText, { color: active ? tabColor : colors.mutedForeground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  tabRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  subFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
  },
  subPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  subPillText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardBody: {
    padding: 14,
    gap: 5,
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 2,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  cardHours: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
