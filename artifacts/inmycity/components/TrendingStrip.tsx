import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendingStripItem {
  id:        string;
  title:     string;
  imageUrl?: string | null;
  meta1:     string;
  meta2?:    string;
  route:     string;
}

interface TrendingStripProps {
  items:        TrendingStripItem[];
  accentColor:  string;
  isLoading?:   boolean;
  label?:       string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W    = 140;
const IMG_H     = 100;
const SKELETON_COUNT = 4;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StripSkeletons({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      scrollEnabled={false}
    >
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[styles.skeleton, { backgroundColor: colors.card }]}
        />
      ))}
    </ScrollView>
  );
}

// ─── Strip card ───────────────────────────────────────────────────────────────

function StripCard({
  item,
  accentColor,
  colors,
}: {
  item:        TrendingStripItem;
  accentColor: string;
  colors:      ReturnType<typeof useColors>;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.85}
    >
      <Image
        source={{
          uri: item.imageUrl
            ?? "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400",
        }}
        style={styles.img}
        contentFit="cover"
      />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.meta1, { color: accentColor }]} numberOfLines={1}>
          {item.meta1}
        </Text>
        {item.meta2 ? (
          <Text style={[styles.meta2, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.meta2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TrendingStrip({
  items,
  accentColor,
  isLoading = false,
  label = "Trending",
}: TrendingStripProps) {
  const colors = useColors();

  if (!isLoading && items.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="trending-up" size={14} color={accentColor} />
        <Text style={[styles.headerText, { color: colors.foreground }]}>{label}</Text>
      </View>

      {/* Strip */}
      {isLoading ? (
        <StripSkeletons colors={colors} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={CARD_W + 10}
          snapToAlignment="start"
        >
          {items.map(item => (
            <StripCard
              key={item.id}
              item={item}
              accentColor={accentColor}
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { paddingBottom: 4 },

  header: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    paddingHorizontal: 16,
    paddingTop:     14,
    paddingBottom:  10,
  },
  headerText: { fontFamily: "Inter_700Bold", fontSize: 16 },

  scrollContent: {
    paddingHorizontal: 16,
    gap:               10,
    paddingBottom:      4,
  },

  card: {
    width:        CARD_W,
    borderRadius: 14,
    overflow:     "hidden",
    borderWidth:  StyleSheet.hairlineWidth,
    ...Platform.select({
      web:     { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" } as any,
      default: {
        shadowColor:   "#000",
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius:  8,
        elevation:     2,
      },
    }),
  },
  img:  { width: CARD_W, height: IMG_H },
  body: { padding: 8, gap: 3 },

  title: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 17 },
  meta1: { fontFamily: "Inter_700Bold",     fontSize: 11 },
  meta2: { fontFamily: "Inter_400Regular",  fontSize: 11 },

  skeleton: {
    width:        CARD_W,
    height:       IMG_H + 58,
    borderRadius: 14,
  },

  divider: {
    height:          StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop:        12,
  },
});
