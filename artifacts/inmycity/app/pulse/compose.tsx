import React, { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGetCommunityPolicy, useSubmitPulsePost } from "@workspace/api-client-react";
import { MUMBAI_LAUNCH_ZONES } from "@workspace/city-config";

/**
 * Posting to Pulse.
 *
 * Tagging a neighbourhood and a topic is what makes a post findable later, so both are offered
 * up front rather than left to free text. Everything submitted waits for a moderator, and the
 * screen says so before the first keystroke.
 */
const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

const TOPICS = [
  { id: "food", label: "Food" },
  { id: "transit", label: "Transit" },
  { id: "tips", label: "Tips" },
  { id: "events", label: "Events" },
] as const;

export default function ComposePulsePostScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [caption, setCaption] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [zone, setZone] = useState<string | null>(null);

  const { data: policy } = useGetCommunityPolicy();
  const submit = useSubmitPulsePost();

  const topPadding = Platform.OS === "web" ? 18 : insets.top + 6;
  const canSubmit = caption.trim().length >= MIN_LENGTH && Boolean(selectedCity?.name);
  const zones = selectedCity?.name === "Mumbai" ? MUMBAI_LAUNCH_ZONES : [];

  const toggleTopic = (id: string) =>
    setTopics((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post to Pulse</Text>
      </View>

      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
      >
        {policy?.submissionsEnabled === false ? (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Posting isn't open yet. We're putting a moderation team in place first, so that
              anything published here has been read by a person.
            </Text>
          </View>
        ) : submit.isSuccess ? (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="check" size={14} color="#15803d" />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{submit.data.message}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>What's happening?</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Something you saw, learned, or would tell a friend."
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={MAX_LENGTH}
              accessibilityLabel="Your post"
            />
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>
              {caption.trim().length}/{MAX_LENGTH}
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Topic</Text>
            <View style={styles.chipRow}>
              {TOPICS.map((topic) => {
                const active = topics.includes(topic.id);
                return (
                  <TouchableOpacity
                    key={topic.id}
                    onPress={() => toggleTopic(topic.id)}
                    activeOpacity={0.8}
                    style={[styles.chip, { backgroundColor: active ? colors.amber : colors.card, borderColor: active ? colors.amber : colors.border }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>{topic.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {zones.length > 0 ? (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>Neighbourhood (optional)</Text>
                <View style={styles.chipRow}>
                  {zones.map((entry) => {
                    const active = zone === entry.id;
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        onPress={() => setZone(active ? null : entry.id)}
                        activeOpacity={0.8}
                        style={[styles.chip, { backgroundColor: active ? colors.amber : colors.card, borderColor: active ? colors.amber : colors.border }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>{entry.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            {submit.isError ? (
              <Text style={[styles.error, { color: "#dc2626" }]}>That didn't send. Check your connection and try again.</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primary, { backgroundColor: canSubmit ? colors.amber : colors.muted }]}
              disabled={!canSubmit || submit.isPending}
              onPress={() =>
                submit.mutate({
                  data: {
                    city: selectedCity!.name,
                    caption: caption.trim(),
                    neighborhoodId: zone,
                    filterTags: topics,
                  },
                })
              }
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {submit.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.primaryText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>Submit for review</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
              A moderator reads every post before it appears. Nothing is published automatically.
            </Text>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, flex: 1 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 130, fontFamily: "Inter_400Regular", fontSize: 15, textAlignVertical: "top" },
  counter: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", marginTop: -8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  fineprint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, textAlign: "center" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  error: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
