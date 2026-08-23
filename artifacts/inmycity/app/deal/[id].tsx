import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetDealById, getGetDealByIdQueryKey } from "@workspace/api-client-react";
import { ErrorState } from "@/components/ListStates";
import { formatPriceForCity } from "@workspace/city-config";

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const dealId = parseInt(id, 10);

  const { data: deal, isLoading, error, refetch } = useGetDealById(dealId, {
    query: { enabled: !!dealId, queryKey: getGetDealByIdQueryKey(dealId) }
  });

  // Inline rather than a full-screen fallback: the user arrived from a list and needs a way
  // back, not an app-restart prompt.
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        <ErrorState error={error} onRetry={refetch} subject="this deal" />
        <TouchableOpacity
          style={styles.errorBack}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[styles.errorBackText, { color: colors.mutedForeground }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (isLoading || !deal) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  let daysLeft = 0;
  if (deal.expiresAt) {
    const expiry = new Date(deal.expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {deal.imageUrl ? (
            <Image
              source={{ uri: deal.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.muted }]} />
          )}
          
          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity 
              style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.header}>
            <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.discountText}>{deal.discountText}</Text>
            </View>
            
            {deal.isExpired ? (
              <View style={[styles.expiryBadge, { backgroundColor: colors.destructive + "1A" }]}>
                <Feather name="slash" size={14} color={colors.destructive} />
                <Text style={[styles.expiryText, { color: colors.destructive }]}>This deal has ended</Text>
              </View>
            ) : daysLeft > 0 ? (
              <View style={[styles.expiryBadge, { backgroundColor: colors.muted }]}>
                <Feather name="clock" size={14} color={colors.foreground} />
                <Text style={[styles.expiryText, { color: colors.foreground }]}>
                  Ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}
                </Text>
              </View>
            ) : null}
          </View>

          {/*
            The list route drops an expired deal, but a saved link or a shared one still lands
            here. Saying so plainly beats a page that looks live and is not.
          */}
          {deal.isExpired ? (
            <View style={[styles.expiredNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.expiredNoticeText, { color: colors.mutedForeground }]}>
                This offer expired on {new Date(deal.expiresAt!).toLocaleDateString()}. The venue may still be
                worth a visit, but do not expect this price.
              </Text>
            </View>
          ) : null}

          <Text style={[styles.title, { color: colors.foreground }]}>{deal.title}</Text>
          <Text style={[styles.placeName, { color: colors.mutedForeground }]}>{deal.placeName}</Text>
          
          <View style={styles.priceRow}>
            {deal.originalPrice != null && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                {formatPriceForCity(deal.originalPrice, deal.city)}
              </Text>
            )}
            {deal.dealPrice != null && (
              <Text style={[styles.dealPrice, { color: colors.amber }]}>
                {formatPriceForCity(deal.dealPrice, deal.city)}
              </Text>
            )}
          </View>

          {deal.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Deal Details</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{deal.description}</Text>
            </View>
          )}

          {/*
            The QR block used to draw an icon captioned "QR Code" with nothing behind it — a
            redemption affordance for a redemption the app cannot perform. Until partner deals
            are real, this shows the code the venue actually accepts and says where to use it.
          */}
          {deal.code && !deal.isExpired ? (
            <View style={styles.redemptionSection}>
              <Text style={[styles.redemptionTitle, { color: colors.foreground }]}>How to redeem</Text>
              <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.codeContainer}>
                  <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Show this code at {deal.placeName}</Text>
                  <Text style={[styles.codeValue, { color: colors.foreground }]}>{deal.code}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBack: { alignSelf: "center", padding: 16, minHeight: 44 },
  expiredNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  expiredNoticeText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  errorBackText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topActions: {
    position: "absolute",
    top: 0,
    left: 0,
    paddingHorizontal: 20,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  discountBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  expiryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 8,
    lineHeight: 34,
  },
  placeName: {
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 32,
  },
  originalPrice: {
    fontFamily: "Inter_500Medium",
    fontSize: 20,
    textDecorationLine: "line-through",
  },
  dealPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 12,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  redemptionSection: {
    marginTop: 8,
  },
  redemptionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  codeContainer: {
    alignItems: "center",
  },
  codeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  codeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: 2,
  },
});
