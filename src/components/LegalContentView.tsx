import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import {
  Typography,
  Spacing,
  Font,
  type ThemeColors,
} from "../constants/colors";
import { useColors } from "../hooks/useColors";

// ─── Draft legal content ────────────────────────────────────────────────────
// Placeholder copy direction — must be reviewed by counsel before release.

const TERMS_CONTENT = `Terms of Service

Last updated: March 2026

1. Overview
Niyah is a productivity app and commitment-contract service. Users stake money as a commitment device to support focus goals. Session outcomes depend on user action, not chance, luck, or random events.

2. Eligibility
You must be at least 18 years old and a U.S. resident to use Niyah. You are responsible for maintaining the security of your account credentials.

3. How Sessions Work
You choose a session cadence (daily, weekly, or monthly) and stake an amount. If you complete the session, your stake is returned. If you surrender early, your stake is forfeited. In group sessions, completers share the pool of forfeited stakes.

4. Not Gambling
Niyah is not a gambling, gaming, lottery, or betting service. Stakes are commitment devices — outcomes are determined entirely by your own actions during the session period.

5. Payments and Settlements
Deposits and withdrawals are processed through Stripe. Group session settlements between participants may use Venmo or other peer-to-peer payment methods. Niyah does not guarantee settlement between participants.

6. User Conduct
You agree not to abuse the service, create fake accounts, manipulate sessions, or engage in fraudulent payment activity. Niyah reserves the right to suspend or terminate accounts that violate these terms.

7. Limitation of Liability
Niyah is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from your use of the service.

8. Changes to Terms
We may update these terms from time to time. When we do, you will be prompted to accept the new version before continuing to use the app.

9. Contact
Questions about these terms? Contact us at support@niyah.app.`;

const PRIVACY_CONTENT = `Privacy Policy

Last updated: March 2026

1. Information We Collect
We collect: account information (name, email, phone number), profile information, session data, social connections, payment-related identifiers (Stripe customer ID, Venmo handle), and legal acceptance records.

2. How We Use Your Data
Your data is used to operate the app: authenticate your identity, run focus sessions, manage your wallet and transactions, enable social features, and maintain legal and compliance records.

3. Service Providers
We use Firebase (Google Cloud) for authentication and data storage, and Stripe for payment processing. These providers process data on our behalf under their respective privacy policies.

4. Data Retention
Your data is retained as long as your account is active. You may request deletion of your account and associated data by contacting us.

5. Your Rights
You may access, correct, or request deletion of your personal data. Contact us at support@niyah.app.

6. Security
We use industry-standard measures to protect your data, including encryption in transit and at rest. However, no system is perfectly secure, and we cannot guarantee absolute security.

7. Changes to This Policy
We may update this policy from time to time. Changes will be reflected in the "Last updated" date above, and you will be prompted to review the new version.

8. Contact
Questions about privacy? Contact us at support@niyah.app.`;

// ─── Component ──────────────────────────────────────────────────────────────

interface LegalContentViewProps {
  /** Which section to display, or "both" (default) */
  section?: "terms" | "privacy" | "both";
}

export const LegalContentView: React.FC<LegalContentViewProps> = ({
  section = "both",
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {(section === "terms" || section === "both") && (
        <View style={styles.section}>
          <Text style={styles.body}>{TERMS_CONTENT}</Text>
        </View>
      )}
      {section === "both" && <View style={styles.divider} />}
      {(section === "privacy" || section === "both") && (
        <View style={styles.section}>
          <Text style={styles.body}>{PRIVACY_CONTENT}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    body: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      lineHeight: Typography.bodySmall * 1.7,
      ...Font.regular,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginVertical: Spacing.lg,
    },
  });
