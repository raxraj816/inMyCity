import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Best street food near me?",
  "How do I get around by transit?",
  "Hidden gems to visit?",
  "Best cafes to work from?",
  "What's happening this weekend?",
  "Safest neighborhoods?",
];

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

export default function AiChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCity } = useCity();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cityName = selectedCity?.name ?? "your city";

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      setLoading(true);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      try {
        abortRef.current = new AbortController();
        const response = await fetch(`${getApiBase()}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, city: cityName, history }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to connect to AI");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.content) {
                accumulated += data.content;
                const snap = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: snap, streaming: true }
                      : m
                  )
                );
              }
              if (data.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, streaming: false } : m
                  )
                );
              }
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: "Sorry, I ran into an error. Please try again.", streaming: false }
                      : m
                  )
                );
              }
            } catch {
              // ignore parse errors for partial lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: "Couldn't connect to the AI assistant. Please check your connection.", streaming: false }
                : m
            )
          );
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false } : m
          )
        );
      }
    },
    [loading, messages, cityName]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}> 
            <Feather name="map" size={14} color="#fff" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          {item.content ? (
            <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.text }]}>
              {item.content}
              {item.streaming && <Text style={{ color: isUser ? "rgba(255,255,255,0.6)" : colors.mutedForeground }}>▌</Text>}
            </Text>
          ) : (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking…</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}> 
      <View style={[s.header, { borderBottomColor: colors.border, paddingTop: Math.max(16, insets.top) }]}> 
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={[s.headerIcon, { backgroundColor: colors.accent }]}> 
            <Feather name="map" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: colors.text }]}>CityPilot</Text>
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{cityName} • AI city guide</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: colors.accent }]}> 
              <Feather name="map" size={32} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Ask me anything about {cityName}</Text>
            <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}> 
              I know the best food spots, transit tips, hidden gems, neighborhoods, events, and more.
            </Text>
            <View style={s.suggestionsGrid}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[s.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.suggestionText, { color: colors.text }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[s.messageList, { paddingBottom: 12 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
        )}

        <View
          style={[
            s.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16,
            },
          ]}
        >
          <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <TextInput
              style={[s.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask about ${cityName}…`}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                { backgroundColor: input.trim() && !loading ? colors.primary : colors.muted },
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Feather name="send" size={16} color={input.trim() && !loading ? "#fff" : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[s.disclaimer, { color: colors.mutedForeground }]}>AI responses may not reflect real-time info</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
      justifyContent: "center",
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
    },
    headerSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 12,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 8,
    },
    suggestionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      marginTop: 4,
    },
    suggestionChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    suggestionText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
    },
    messageList: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    messageRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    messageRowUser: {
      justifyContent: "flex-end",
    },
    messageRowAssistant: {
      justifyContent: "flex-start",
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    bubble: {
      maxWidth: "80%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    bubbleUser: {
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      borderBottomLeftRadius: 4,
      borderWidth: 1,
    },
    bubbleText: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
    },
    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    typingText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    inputBar: {
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 6,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "flex-end",
      borderRadius: 24,
      borderWidth: 1,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      gap: 8,
    },
    input: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      maxHeight: 100,
      paddingTop: Platform.OS === "ios" ? 6 : 4,
      paddingBottom: Platform.OS === "ios" ? 6 : 4,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    disclaimer: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      textAlign: "center",
    },
  });
}
