import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Typography,
  Spacing,
  Font,
  type ThemeColors,
} from "../../constants/colors";
import { useColors } from "../../hooks/useColors";
import { Card } from "../Card";
import { formatMoney, formatRelativeTime } from "../../utils/format";
import type { Transaction } from "../../types";

interface TransactionHistoryProps {
  transactions: Transaction[];
  /** Max number of transactions to show (default: 5) */
  limit?: number;
}

export function TransactionHistory({
  transactions,
  limit = 5,
}: TransactionHistoryProps) {
  const Colors = useColors();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction History</Text>
      {transactions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </Card>
      ) : (
        transactions.slice(0, limit).map((tx) => (
          <View key={tx.id} style={styles.transactionRow}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDesc}>{tx.description}</Text>
              <Text style={styles.transactionDate}>
                {formatRelativeTime(tx.createdAt)}
              </Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                tx.amount >= 0 ? styles.amountPositive : styles.amountNegative,
              ]}
            >
              {tx.amount >= 0 ? "+" : ""}
              {formatMoney(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    emptyCard: {
      alignItems: "center",
      paddingVertical: Spacing.xl,
    },
    emptyText: {
      fontSize: Typography.bodySmall,
      color: Colors.textMuted,
    },
    transactionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDesc: {
      fontSize: Typography.bodyMedium,
      color: Colors.text,
    },
    transactionDate: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      fontVariant: ["tabular-nums"],
    },
    amountPositive: {
      color: Colors.gain,
    },
    amountNegative: {
      color: Colors.loss,
    },
  });
