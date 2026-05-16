import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetFavorites, useGetCollections } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";

type Tab = "favorites" | "collections";

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.trim()[0] ?? "";
  const l = lastName?.trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("favorites");

  const { data: favorites, isLoading: favLoading, refetch: refetchFav } = useGetFavorites();
  const { data: collections, isLoading: colLoading, refetch: refetchCol } = useGetCollections();

  const onRefresh = () => { refetchFav(); refetchCol(); };
  const isRefreshing = favLoading || colLoading;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 8;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const displayName = isAuthenticated && user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Member"
    : "Guest";

  const initials = isAuthenticated && user
    ? getInitials(user.firstName, user.lastName)
    : "G";

  const subtitle = isAuthenticated && user
    ? user.email ?? "Signed in"
    : "Sign in to sync across devices";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      {/* Avatar card */}
      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Avatar */}
        {isAuthenticated && user?.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={styles.avatarImg}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.amber }]}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}

        {/* Name + sub */}
        <View style={styles.avatarInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.userSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* Sign In / Sign Out button */}
        {authLoading ? (
          <ActivityIndicator size="small" color={colors.amber} />
        ) : isAuthenticated ? (
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.muted }]}
            onPress={logout}
            activeOpacity={0.85}
          >
            <Text style={[styles.signInBtnText, { color: colors.foreground }]}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.amber }]}
            onPress={login}
            activeOpacity={0.85}
          >
            <Text style={[styles.signInBtnText, { color: "#fff" }]}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Saved section */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SAVED</Text>
      <View style={[styles.savedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["favorites", "collections"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tab,
                activeTab === t && { borderBottomColor: colors.amber, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(t)}
            >
              <Feather
                name={t === "favorites" ? "heart" : "folder"}
                size={14}
                color={activeTab === t ? colors.amber : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === t ? colors.amber : colors.mutedForeground },
                  activeTab === t && { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {t === "favorites" ? "Favorites" : "Collections"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "favorites" && (
          <View>
            {favLoading && !favorites ? (
              <View style={styles.skeletonWrap}>
                <SkeletonCard style={styles.skeleton} />
                <SkeletonCard style={styles.skeleton} />
              </View>
            ) : !favorites?.length ? (
              <View style={styles.emptyWrap}>
                <Feather name="heart" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No favorites yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isAuthenticated
                    ? "Tap the heart on any place to save it here."
                    : "Sign in to save and sync favorites across devices."}
                </Text>
              </View>
            ) : (
              favorites.map((fav) => <PlaceCard key={fav.id} place={fav.place} />)
            )}
          </View>
        )}

        {activeTab === "collections" && (
          <View style={{ padding: 16, gap: 12 }}>
            {colLoading && !collections ? (
              <View style={styles.skeletonWrap}>
                <SkeletonCard height={88} style={styles.skeleton} />
                <SkeletonCard height={88} style={styles.skeleton} />
              </View>
            ) : !collections?.length ? (
              <View style={styles.emptyWrap}>
                <Feather name="folder" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No collections</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Create collections to organise your saved places.
                </Text>
              </View>
            ) : (
              collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  activeOpacity={0.75}
                  style={[styles.colCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={[styles.colIcon, { backgroundColor: colors.muted }]}>
                    <Feather name="folder" size={18} color={colors.amber} />
                  </View>
                  <View style={styles.colInfo}>
                    <Text style={[styles.colName, { color: colors.foreground }]}>{col.name}</Text>
                    <Text style={[styles.colCount, { color: colors.mutedForeground }]}>
                      {col.places?.length ?? 0} places
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Settings */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {([
          { icon: "bell" as const,  label: "Notifications" },
          { icon: "moon" as const,  label: "Dark Mode"     },
          { icon: "info" as const,  label: "About inMyCity" },
        ]).map(({ icon, label }, idx, arr) => (
          <TouchableOpacity
            key={label}
            style={[
              styles.settingsRow,
              idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: colors.muted }]}>
              <Feather name={icon} size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    }),
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarInitial: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  avatarInfo: { flex: 1 },
  userName: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 2 },
  userSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  signInBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  signInBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  savedCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    }),
  },
  tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  skeletonWrap: { padding: 16, gap: 12 },
  skeleton: { marginBottom: 0 },
  emptyWrap: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  colCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  colIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  colInfo: { flex: 1 },
  colName: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 2 },
  colCount: { fontFamily: "Inter_500Medium", fontSize: 12 },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    }),
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15 },
});
