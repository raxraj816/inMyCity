import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetDealById, getGetDealByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const dealId = parseInt(id, 10);

  const { data: deal, isLoading, error, refetch } = useGetDealById(dealId, {
    query: { enabled: !!dealId, queryKey: getGetDealByIdQueryKey(dealId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  
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
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.header}>
            <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.discountText}>{deal.discountText}</Text>
            </View>
            
            {daysLeft > 0 && (
              <View style={[styles.expiryBadge, { backgroundColor: colors.muted }]}>
                <Feather name="clock" size={14} color={colors.foreground} />
                <Text style={[styles.expiryText, { color: colors.foreground }]}>Ends in {daysLeft} days</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{deal.title}</Text>
          <Text style={[styles.placeName, { color: colors.mutedForeground }]}>{deal.placeName}</Text>
          
          <View style={styles.priceRow}>
            {deal.originalPrice !== null && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                ${deal.originalPrice}
              </Text>
            )}
            {deal.dealPrice !== null && (
              <Text style={[styles.dealPrice, { color: colors.amber }]}>
                ${deal.dealPrice}
              </Text>
            )}
          </View>

          {deal.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Deal Details</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{deal.description}</Text>
            </View>
          )}

          {(deal.code || deal.qrData) && (
            <View style={styles.redemptionSection}>
              <Text style={[styles.redemptionTitle, { color: colors.foreground }]}>How to redeem</Text>
              
              <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {deal.qrData && (
                  <View style={[styles.qrPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="maximize" size={48} color={colors.mutedForeground} />
                    <Text style={{ marginTop: 8, color: colors.mutedForeground }}>QR Code</Text>
                  </View>
                )}
                
                {deal.code && (
                  <View style={styles.codeContainer}>
                    <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Promo Code</Text>
                    <Text style={[styles.codeValue, { color: colors.foreground }]}>{deal.code}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    right: 0,
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
    backgroundColor: "#fff",
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
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
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
