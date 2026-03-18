import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button } from "../../src/components";
import * as Haptics from "expo-haptics";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useSocialStore } from "../../src/store/socialStore";
import { useAuthStore } from "../../src/store/authStore";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { formatMoney } from "../../src/utils/format";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDurationToMs(durationLabel: string): number {
  const durationMap: Record<string, number> = {
    "30 min": 30 * 60 * 1000,
    "1 hr": 60 * 60 * 1000,
    "2 hrs": 2 * 60 * 60 * 1000,
    "4 hrs": 4 * 60 * 60 * 1000,
    "All day": 12 * 60 * 60 * 1000,
  };
  return durationMap[durationLabel] || 60 * 60 * 1000; // default 1 hour
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_STAKES = [500, 1000, 2500, 5000]; // cents

const DURATIONS = [
  { label: "30 min", value: "30min" },
  { label: "1 hr", value: "1hr" },
  { label: "2 hrs", value: "2hr" },
  { label: "4 hrs", value: "4hr" },
  { label: "All day", value: "allday" },
];

const DAYS = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Weekend", value: "weekend" },
  { label: "Next Week", value: "nextweek" },
];

const TIMES = [
  { label: "Morning", sub: "9:00 am", value: "morning" },
  { label: "Afternoon", sub: "2:00 pm", value: "afternoon" },
  { label: "Evening", sub: "7:00 pm", value: "evening" },
  { label: "Night", sub: "10:00 pm", value: "night" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
    },
    backText: {
      color: Colors.textSecondary,
      fontSize: Typography.bodyLarge,
      ...Font.medium,
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.bold,
      color: Colors.text,
    },
    subtitle: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xl,
    },
    sectionLabel: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
      color: Colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
      marginTop: Spacing.lg,
    },
    // ── Chips ─────────────────────────────────────────────────────────────────
    chipsRow: {
      flexDirection: "row",
      gap: Spacing.sm,
      flexWrap: "wrap",
    },
    chip: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.backgroundCard,
    },
    chipSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    chipText: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.textSecondary,
    },
    chipTextSelected: {
      color: Colors.primaryLight,
    },
    // ── Schedule chips (two-line with sub) ───────────────────────────────────
    scheduleGrid: {
      flexDirection: "row",
      gap: Spacing.sm,
      flexWrap: "wrap",
    },
    scheduleChip: {
      flex: 1,
      minWidth: "45%",
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.backgroundCard,
      alignItems: "center",
    },
    scheduleChipSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    scheduleChipLabel: {
      fontSize: Typography.bodySmall,
      ...Font.semibold,
      color: Colors.textSecondary,
    },
    scheduleChipLabelSelected: {
      color: Colors.primaryLight,
    },
    scheduleChipSub: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      marginTop: 2,
    },
    scheduleChipSubSelected: {
      color: Colors.primaryLight,
      opacity: 0.7,
    },
    // ── Custom inputs ─────────────────────────────────────────────────────────
    customInput: {
      marginTop: Spacing.sm,
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: Typography.bodyMedium,
      letterSpacing: 0,
      ...Font.regular,
      color: Colors.text,
    },
    customInputActive: {
      borderColor: Colors.primary,
    },
    // ── People ────────────────────────────────────────────────────────────────
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.sm,
      gap: Spacing.md,
    },
    personRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarSelected: {
      backgroundColor: Colors.primaryMuted,
    },
    avatarText: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.textSecondary,
    },
    avatarTextSelected: {
      color: Colors.primaryLight,
    },
    personName: {
      flex: 1,
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.text,
    },
    personTag: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: Colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    checkMark: {
      color: Colors.white,
      fontSize: 12,
      ...Font.bold,
    },
    emptyText: {
      fontSize: Typography.bodySmall,
      color: Colors.textMuted,
      fontStyle: "italic",
      paddingVertical: Spacing.md,
    },
    // ── Summary card ──────────────────────────────────────────────────────────
    summaryCard: {
      padding: Spacing.lg,
      marginTop: Spacing.lg,
    },
    summaryTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
    },
    summaryLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
    },
    summaryValue: {
      fontSize: Typography.bodySmall,
      ...Font.medium,
      color: Colors.text,
    },
    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      gap: Spacing.sm,
    },
    footerHint: {
      textAlign: "center",
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
    },
    // ── Success state ─────────────────────────────────────────────────────────
    successContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: Spacing.xl,
      gap: Spacing.lg,
    },
    successEmoji: {
      fontSize: 56,
    },
    successTitle: {
      fontSize: Typography.headlineMedium,
      ...Font.bold,
      color: Colors.text,
      textAlign: "center",
    },
    successSubtitle: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    successDetail: {
      fontSize: Typography.bodySmall,
      color: Colors.textMuted,
      textAlign: "center",
    },
  });

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProposeSessionScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { user } = useAuthStore();
  const { partners } = usePartnerStore();
  const { following, profiles } = useSocialStore();
  const { proposeSession } = useGroupSessionStore();

  // Stake
  const [stake, setStake] = useState<number | null>(null);
  const [customStake, setCustomStake] = useState("");
  const [stakeFocused, setStakeFocused] = useState(false);

  // Duration
  const [duration, setDuration] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState("");
  const [durationFocused, setDurationFocused] = useState(false);

  // Day
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [customDay, setCustomDay] = useState("");
  const [dayFocused, setDayFocused] = useState(false);

  // Time
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [timeFocused, setTimeFocused] = useState(false);

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [proposed, _setProposed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Build inviteable people list: partners + following (deduped)
  const people = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string; tag: string }[] = [];
    for (const p of partners) {
      if (!seen.has(p.oderId)) {
        seen.add(p.oderId);
        list.push({ id: p.oderId, name: p.name, tag: "Partner" });
      }
    }
    for (const uid of following) {
      if (!seen.has(uid) && uid !== user?.id) {
        seen.add(uid);
        const profile = profiles[uid];
        list.push({ id: uid, name: profile?.name ?? uid, tag: "Following" });
      }
    }
    return list;
  }, [partners, following, profiles, user?.id]);

  const effectiveStake =
    stake ?? (customStake ? parseInt(customStake) * 100 : null);
  const effectiveDuration = duration
    ? DURATIONS.find((d) => d.value === duration)?.label
    : customDuration.trim() || null;
  const effectiveDay = selectedDay
    ? DAYS.find((d) => d.value === selectedDay)?.label
    : customDay.trim() || null;
  const effectiveTime = selectedTime
    ? TIMES.find((t) => t.value === selectedTime)?.sub
    : customTime.trim() || null;

  const canPropose =
    effectiveStake !== null &&
    effectiveStake > 0 &&
    effectiveDuration !== null &&
    selectedPeople.length > 0 &&
    effectiveDay !== null &&
    effectiveTime !== null;

  const togglePerson = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handlePropose = async () => {
    if (!canPropose) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      // Convert duration label to ms
      const durationMs = parseDurationToMs(effectiveDuration!);
      // Stake in cents
      const stakeCents = effectiveStake!;

      const sessionId = await proposeSession({
        cadence: "daily", // Default cadence for custom proposals
        stakePerParticipant: stakeCents,
        duration: durationMs,
        inviteeIds: selectedPeople,
        customStake: true,
      });

      // Navigate to waiting room instead of showing local success
      router.push(`/session/waiting-room?sessionId=${sessionId}` as Href);
    } catch {
      Alert.alert("Error", "Failed to create group session. Please try again.");
      setLoading(false);
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────

  if (proposed) {
    const invitedNames = selectedPeople
      .map((id) => people.find((p) => p.id === id)?.name ?? id)
      .join(", ");

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🌱</Text>
          <Text style={styles.successTitle}>Challenge Proposed</Text>
          <Text style={styles.successSubtitle}>
            Your invite has been sent to{" "}
            <Text style={{ color: Colors.primaryLight, ...Font.semibold }}>
              {invitedNames}
            </Text>
            .{"\n"}The session starts{" "}
            <Text style={{ color: Colors.text, ...Font.semibold }}>
              {effectiveDay} at {effectiveTime}
            </Text>{" "}
            for{" "}
            <Text style={{ color: Colors.text, ...Font.semibold }}>
              {effectiveDuration}
            </Text>
            .
          </Text>
          <Text style={styles.successDetail}>
            Once everyone accepts, the {formatMoney(effectiveStake!)} stake
            locks in.
          </Text>
          <Button
            title="Back to Home"
            onPress={() => router.replace("/(tabs)")}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>

        <Text style={styles.title}>Group Challenge</Text>
        <Text style={styles.subtitle}>
          Set a stake, invite your friends, and schedule a time.
        </Text>

        {/* ── Stake ────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Stake</Text>
        <View style={styles.chipsRow}>
          {QUICK_STAKES.map((s) => {
            const selected = stake === s && !customStake;
            return (
              <Pressable
                key={s}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStake(s);
                  setCustomStake("");
                }}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {formatMoney(s)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[styles.customInput, stakeFocused && styles.customInputActive]}
          placeholder="Custom amount (e.g. 15)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          value={customStake}
          onChangeText={(v) => {
            setCustomStake(v.replace(/[^0-9]/g, ""));
            setStake(null);
          }}
          onFocus={() => setStakeFocused(true)}
          onBlur={() => setStakeFocused(false)}
        />

        {/* ── Duration ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Duration</Text>
        <View style={styles.chipsRow}>
          {DURATIONS.map((d) => {
            const selected = duration === d.value && !customDuration;
            return (
              <Pressable
                key={d.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDuration(d.value);
                  setCustomDuration("");
                }}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[
            styles.customInput,
            durationFocused && styles.customInputActive,
          ]}
          placeholder="Custom duration (e.g. 90 mins)"
          placeholderTextColor={Colors.textMuted}
          value={customDuration}
          onChangeText={(v) => {
            setCustomDuration(v);
            setDuration(null);
          }}
          onFocus={() => setDurationFocused(true)}
          onBlur={() => setDurationFocused(false)}
        />

        {/* ── Invite Friends ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Invite Friends</Text>
        <Card>
          {people.length === 0 ? (
            <Text style={styles.emptyText}>
              Follow people or add partners to invite them.
            </Text>
          ) : (
            people.map((person, i) => {
              const selected = selectedPeople.includes(person.id);
              const isLast = i === people.length - 1;
              return (
                <Pressable
                  key={person.id}
                  style={[styles.personRow, !isLast && styles.personRowBorder]}
                  onPress={() => togglePerson(person.id)}
                >
                  <View
                    style={[styles.avatar, selected && styles.avatarSelected]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        selected && styles.avatarTextSelected,
                      ]}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personTag}>{person.tag}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      selected && styles.checkCircleSelected,
                    ]}
                  >
                    {selected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })
          )}
        </Card>

        {/* ── Day ──────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Day</Text>
        <View style={styles.chipsRow}>
          {DAYS.map((d) => (
            <Pressable
              key={d.value}
              style={[
                styles.chip,
                selectedDay === d.value && !customDay && styles.chipSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(d.value);
                setCustomDay("");
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDay === d.value &&
                    !customDay &&
                    styles.chipTextSelected,
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.customInput, dayFocused && styles.customInputActive]}
          placeholder="Custom date (e.g. March 3rd)"
          placeholderTextColor={Colors.textMuted}
          value={customDay}
          onChangeText={(v) => {
            setCustomDay(v);
            setSelectedDay(null);
          }}
          onFocus={() => setDayFocused(true)}
          onBlur={() => setDayFocused(false)}
        />

        {/* ── Time ─────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Start Time</Text>
        <View style={styles.scheduleGrid}>
          {TIMES.map((t) => {
            const selected = selectedTime === t.value && !customTime;
            return (
              <Pressable
                key={t.value}
                style={[
                  styles.scheduleChip,
                  selected && styles.scheduleChipSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTime(t.value);
                  setCustomTime("");
                }}
              >
                <Text
                  style={[
                    styles.scheduleChipLabel,
                    selected && styles.scheduleChipLabelSelected,
                  ]}
                >
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.scheduleChipSub,
                    selected && styles.scheduleChipSubSelected,
                  ]}
                >
                  {t.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[styles.customInput, timeFocused && styles.customInputActive]}
          placeholder="Custom time (e.g. 3:30 pm)"
          placeholderTextColor={Colors.textMuted}
          value={customTime}
          onChangeText={(v) => {
            setCustomTime(v);
            setSelectedTime(null);
          }}
          onFocus={() => setTimeFocused(true)}
          onBlur={() => setTimeFocused(false)}
        />

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        {canPropose && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Challenge Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Stake per person</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(effectiveStake!)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{effectiveDuration}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inviting</Text>
              <Text style={styles.summaryValue}>
                {selectedPeople.length}{" "}
                {selectedPeople.length === 1 ? "person" : "people"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Starts</Text>
              <Text style={styles.summaryValue}>
                {effectiveDay} at {effectiveTime}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Button
          title="Propose Challenge"
          onPress={handlePropose}
          disabled={!canPropose}
          loading={loading}
          size="large"
        />
        {!canPropose && (
          <Text style={styles.footerHint}>
            Set a stake, duration, at least one friend, and a time
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
