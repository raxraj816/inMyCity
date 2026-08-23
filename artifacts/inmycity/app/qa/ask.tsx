import React, { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useGetCommunityPolicy, useSubmitQaQuestion } from "@workspace/api-client-react";

/**
 * Asking a question.
 *
 * Nothing typed here reaches another reader without a moderator publishing it, and the screen
 * says so before you start rather than after you press send. When submissions are closed the
 * form is not shown at all — offering an input that will 503 is worse than not offering one.
 */
const MIN_LENGTH = 10;
const MAX_LENGTH = 300;

export default function AskQuestionScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [question, setQuestion] = useState("");
  const [detail, setDetail] = useState("");

  const { data: policy } = useGetCommunityPolicy();
  const submit = useSubmitQaQuestion();

  const topPadding = Platform.OS === "web" ? 18 : insets.top + 6;
  const canSubmit = question.trim().length >= MIN_LENGTH && Boolean(selectedCity?.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ask about {selectedCity?.name ?? "your city"}</Text>
      </View>

      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
      >
        {policy?.submissionsEnabled === false ? (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Asking isn't open yet. We're putting a moderation team in place first, so that
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
            <Text style={[styles.label, { color: colors.foreground }]}>Your question</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="e.g. Where can I get good filter coffee near Matunga before 8am?"
              placeholderTextColor={colors.mutedForeground}
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={MAX_LENGTH}
              accessibilityLabel="Your question"
            />
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>
              {question.trim().length}/{MAX_LENGTH}
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Anything else? (optional)</Text>
            <TextInput
              style={[styles.input, styles.tallInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Context helps people answer well."
              placeholderTextColor={colors.mutedForeground}
              value={detail}
              onChangeText={setDetail}
              multiline
              maxLength={2000}
              accessibilityLabel="Extra detail"
            />

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
                    question: question.trim(),
                    body: detail.trim() || null,
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
              A moderator reads every question before it appears. Nothing is published automatically.
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
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 84, fontFamily: "Inter_400Regular", fontSize: 15, textAlignVertical: "top" },
  tallInput: { minHeight: 120 },
  counter: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", marginTop: -8 },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  fineprint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, textAlign: "center" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  error: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
