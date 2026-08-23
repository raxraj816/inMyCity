import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useGetCommunityPolicy,
  useSubmitContentReport,
  SubmitContentReportInputReason,
  type SubmitContentReportInputTargetType,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

/**
 * The published takedown path, as a screen a reader can actually reach.
 *
 * India's IT Rules require an intermediary to name a grievance officer and answer complaints
 * inside a stated window. The window shown here is the one the server stamps on the report, so
 * the promise made to the reporter and the deadline in the moderation queue are the same
 * number — and the grievance contact comes from `/community-policy` rather than being written
 * into the app, so it cannot drift out of date behind a release.
 */

type ReportTarget = {
  targetType: SubmitContentReportInputTargetType;
  targetId: number;
  /** What the reader is looking at, echoed back so they know they picked the right thing. */
  label: string;
};

const REASON_LABELS: Record<string, string> = {
  inaccurate: "It's wrong or out of date",
  spam: "Spam or advertising",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech",
  adult_content: "Sexual or adult content",
  impersonation: "Impersonation",
  copyright: "Copyright",
  privacy: "Private information",
  illegal: "Illegal content",
  other: "Something else",
};

const REASON_ORDER = Object.keys(SubmitContentReportInputReason) as (keyof typeof SubmitContentReportInputReason)[];

export function ReportContentSheet({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [receipt, setReceipt] = useState<{ responseHours: number; message: string } | null>(null);

  const { data: policy } = useGetCommunityPolicy();
  const submit = useSubmitContentReport();

  const close = () => {
    setReason(null);
    setDetails("");
    setReceipt(null);
    submit.reset();
    onClose();
  };

  const onSubmit = () => {
    if (!target || !reason) return;
    submit.mutate(
      {
        data: {
          targetType: target.targetType,
          targetId: target.targetId,
          reason: reason as (typeof SubmitContentReportInputReason)[keyof typeof SubmitContentReportInputReason],
          details: details.trim() || null,
        },
      },
      { onSuccess: (result) => setReceipt({ responseHours: result.responseHours, message: result.message }) },
    );
  };

  const officer = policy?.grievanceOfficer ?? null;
  const hoursFor = (id: string) => policy?.reportReasons.find((entry) => entry.id === id)?.responseHours;

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.grabber} />

        {receipt ? (
          <View style={styles.doneWrap}>
            <View style={[styles.doneIcon, { backgroundColor: "#15803d18" }]}>
              <Feather name="check" size={26} color="#15803d" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Report received</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{receipt.message}</Text>
            {officer ? (
              <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
                Grievance officer: {officer.officerName} · {officer.email}
              </Text>
            ) : null}
            <TouchableOpacity style={[styles.primary, { backgroundColor: colors.amber }]} onPress={close} activeOpacity={0.85}>
              <Text style={styles.primaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={[styles.title, { color: colors.foreground }]}>Report this</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
              {target?.label}
            </Text>

            <View style={styles.reasonList}>
              {REASON_ORDER.map((id) => {
                const selected = reason === id;
                const hours = hoursFor(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.reason,
                      { borderColor: selected ? colors.amber : colors.border, backgroundColor: selected ? colors.amber + "12" : colors.card },
                    ]}
                    onPress={() => setReason(id)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={17}
                      color={selected ? colors.amber : colors.mutedForeground}
                    />
                    <View style={styles.reasonText}>
                      <Text style={[styles.reasonLabel, { color: colors.foreground }]}>{REASON_LABELS[id]}</Text>
                      {hours ? (
                        <Text style={[styles.reasonHours, { color: colors.mutedForeground }]}>
                          Answered within {hours} hours
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Anything else we should know? (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={2000}
              accessibilityLabel="Extra detail about this report"
            />

            {submit.isError ? (
              <Text style={[styles.error, { color: "#dc2626" }]}>
                That didn't go through. Check your connection and try again.
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primary, { backgroundColor: reason ? colors.amber : colors.muted }]}
              onPress={onSubmit}
              disabled={!reason || submit.isPending}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {submit.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.primaryText, { color: reason ? "#fff" : colors.mutedForeground }]}>Send report</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
              {officer
                ? `Reports go to ${officer.officerName}, our grievance officer, at ${officer.email}.`
                : "Reports go to our moderation team."}
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.4)", marginTop: 10, marginBottom: 14 },
  scroll: { paddingBottom: 8, gap: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 19 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  reasonList: { gap: 8 },
  reason: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  reasonText: { flex: 1 },
  reasonLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  reasonHours: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 76, fontFamily: "Inter_400Regular", fontSize: 14, textAlignVertical: "top" },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  fineprint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, textAlign: "center" },
  error: { fontFamily: "Inter_500Medium", fontSize: 13 },
  doneWrap: { alignItems: "center", gap: 12, paddingVertical: 18 },
  doneIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
});

export type { ReportTarget };
