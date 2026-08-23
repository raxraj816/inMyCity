import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { ErrorState } from "@/components/ListStates";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ReportContentSheet, type ReportTarget } from "@/components/ReportContentSheet";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  getGetQaQuestionByIdQueryKey,
  useGetCommunityPolicy,
  useGetQaQuestionById,
  useSubmitQaAnswer,
  useToggleQaUpvote,
  type QaAnswer,
} from "@workspace/api-client-react";

/**
 * One question and the answers that cleared review.
 *
 * The accepted answer is first and marked, because a reader scanning five replies for the one
 * that is actually right is the failure mode a Q&A section has. Answering is only offered when
 * submissions are open; otherwise the screen says so rather than showing a dead input.
 */
function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const questionId = Number(id);
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const query = useGetQaQuestionById(questionId, {
    query: { enabled: Number.isFinite(questionId), queryKey: getGetQaQuestionByIdQueryKey(questionId) },
  });
  const { data: policy } = useGetCommunityPolicy();
  const toggleUpvote = useToggleQaUpvote();
  const submitAnswer = useSubmitQaAnswer();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/qa/questions"] });

  const topPadding = Platform.OS === "web" ? 18 : insets.top + 6;
  const bottomPadding = Platform.OS === "web" ? 32 : insets.bottom + 32;

  const header = (
    <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
        <Feather name="arrow-left" size={21} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Question</Text>
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <ErrorState error={query.error} onRetry={() => query.refetch()} subject="this question" />
      </View>
    );
  }

  const question = query.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 14 }}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.amber + "20" }]}>
              <Text style={[styles.avatarText, { color: colors.amber }]}>{question.authorInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.foreground }]}>{question.authorName}</Text>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(question.publishedAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setReportTarget({ targetType: "qa_question", targetId: question.id, label: question.question })}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Report this question"
            >
              <Feather name="flag" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.question, { color: colors.foreground }]}>{question.question}</Text>
          {question.body ? <Text style={[styles.body, { color: colors.mutedForeground }]}>{question.body}</Text> : null}

          {question.tags.length > 0 ? (
            <View style={styles.tags}>
              {question.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.upvote, { borderColor: question.viewerHasUpvoted ? colors.amber : colors.border }]}
            onPress={() =>
              toggleUpvote.mutate({ targetType: "questions", id: question.id }, { onSuccess: () => { query.refetch(); refresh(); } })
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={question.viewerHasUpvoted ? "Remove upvote" : "Upvote this question"}
          >
            <Feather name="arrow-up" size={15} color={question.viewerHasUpvoted ? colors.amber : colors.mutedForeground} />
            <Text style={[styles.upvoteText, { color: question.viewerHasUpvoted ? colors.amber : colors.mutedForeground }]}>
              {question.upvoteCount} {question.upvoteCount === 1 ? "upvote" : "upvotes"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {question.answers.length} {question.answers.length === 1 ? "answer" : "answers"}
        </Text>

        {question.answers.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="message-square" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              No answer has cleared review yet.
            </Text>
          </View>
        ) : (
          question.answers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              colors={colors}
              onUpvote={() =>
                toggleUpvote.mutate({ targetType: "answers", id: answer.id }, { onSuccess: () => query.refetch() })
              }
              onReport={() => setReportTarget({ targetType: "qa_answer", targetId: answer.id, label: answer.body })}
            />
          ))
        )}

        {policy?.submissionsEnabled ? (
          submitted ? (
            <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="check" size={14} color="#15803d" />
              <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                Thanks — a moderator will review your answer before it appears.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your answer</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="What would you tell a friend who asked this?"
                placeholderTextColor={colors.mutedForeground}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={2000}
                accessibilityLabel="Your answer"
              />
              {submitAnswer.isError ? (
                <Text style={[styles.error, { color: "#dc2626" }]}>That didn't send. Try again in a moment.</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: draft.trim().length >= 10 ? colors.amber : colors.muted }]}
                disabled={draft.trim().length < 10 || submitAnswer.isPending}
                onPress={() =>
                  submitAnswer.mutate(
                    { id: question.id, data: { body: draft.trim() } },
                    { onSuccess: () => { setSubmitted(true); setDraft(""); } },
                  )
                }
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                {submitAnswer.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.primaryText, { color: draft.trim().length >= 10 ? "#fff" : colors.mutedForeground }]}>
                    Submit for review
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Answering opens once our moderation team is in place.
            </Text>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>

      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </View>
  );
}

function AnswerCard({
  answer,
  colors,
  onUpvote,
  onReport,
}: {
  answer: QaAnswer;
  colors: ReturnType<typeof useColors>;
  onUpvote: () => void;
  onReport: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: answer.isAccepted ? "#15803d55" : colors.border },
      ]}
    >
      {answer.isAccepted ? (
        <View style={styles.acceptedRow}>
          <Feather name="check-circle" size={13} color="#15803d" />
          <Text style={styles.acceptedText}>Checked by our editors</Text>
        </View>
      ) : null}

      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>{answer.authorInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>{answer.authorName}</Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(answer.publishedAt)}</Text>
        </View>
        <TouchableOpacity onPress={onReport} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Report this answer">
          <Feather name="flag" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.body, { color: colors.foreground }]}>{answer.body}</Text>

      <TouchableOpacity
        style={[styles.upvote, { borderColor: answer.viewerHasUpvoted ? colors.amber : colors.border }]}
        onPress={onUpvote}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={answer.viewerHasUpvoted ? "Remove upvote" : "Upvote this answer"}
      >
        <Feather name="arrow-up" size={14} color={answer.viewerHasUpvoted ? colors.amber : colors.mutedForeground} />
        <Text style={[styles.upvoteText, { color: answer.viewerHasUpvoted ? colors.amber : colors.mutedForeground }]}>
          {answer.upvoteCount}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 11 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  time: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  question: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 25 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  upvote: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6 },
  upvoteText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  acceptedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  acceptedText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#15803d" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, flex: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 96, fontFamily: "Inter_400Regular", fontSize: 14, textAlignVertical: "top" },
  primary: { borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  error: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
