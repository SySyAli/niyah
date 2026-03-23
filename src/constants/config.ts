// Session configurations
//
// Phase 1 (App Store launch): GROUP SESSIONS ONLY
//   Peer-to-peer pool. Completers split surrenderers' stakes. NIYAH takes no cut.
//   All money comes from participants — no Niyah treasury involvement.
//
// Phase 2 (future): SOLO SESSIONS
//   NIYAH is the counterparty. Complete = earn SOLO_COMPLETION_MULTIPLIER × stake.
//   Surrender = lose stake (NIYAH keeps it). Requires Niyah to fund payouts.

// Payout multiplier for solo sessions (Phase 2, not yet active in sessionStore).
// Stake $5, complete → earn $10. NIYAH profits if >50% of users surrender.
export const SOLO_COMPLETION_MULTIPLIER = 2;
export const CADENCES = {
  daily: {
    id: "daily",
    name: "Daily",
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    demoDuration: 10 * 1000, // 10 seconds for demo
    stake: 500, // $5.00 in cents - each partner stakes this
  },
  weekly: {
    id: "weekly",
    name: "Weekly",
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    demoDuration: 60 * 1000, // 60 seconds for demo
    stake: 2500, // $25.00 in cents
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    demoDuration: 90 * 1000, // 90 seconds for demo
    stake: 10000, // $100.00 in cents
  },
} as const;

// Demo mode settings
export const DEMO_MODE = true;
export const INITIAL_BALANCE = 5000; // $50.00 in cents

// Reputation thresholds
export const REPUTATION_LEVELS = {
  seed: { min: 0, max: 20, label: "Seed", description: "New to NIYAH" },
  sprout: { min: 21, max: 40, label: "Sprout", description: "Growing trust" },
  sapling: {
    min: 41,
    max: 60,
    label: "Sapling",
    description: "Reliable partner",
  },
  tree: { min: 61, max: 80, label: "Tree", description: "Trusted member" },
  oak: {
    min: 81,
    max: 100,
    label: "Oak",
    description: "Pillar of the community",
  },
} as const;

// Legal versioning
// Bump this when Terms or Privacy content changes to re-prompt all users.
export const CURRENT_LEGAL_VERSION = "1.0.0";

// Referral system
// Each accepted referral permanently boosts the new user's social credit score by this amount.
// e.g. a brand-new user (score 50) who joins via referral starts at 60.
export const REFERRAL_REPUTATION_BOOST = 10; // points added to score per referral (max 100)
export const PENDING_REFERRAL_KEY = "@niyah/pending_referral"; // AsyncStorage key
