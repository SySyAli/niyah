// Session configurations
// stickK model: stake = stake (no 2x payouts, no gambling)
// Duo sessions: loser pays winner their stake
export const CADENCES = {
  daily: {
    id: "daily",
    name: "Daily",
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    demoDuration: 30 * 1000, // 30 seconds for demo
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

export type CadenceId = keyof typeof CADENCES;

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

// Venmo deep link format
// venmo://paycharge?txn=pay&recipients=USERNAME&amount=AMOUNT&note=NOTE
export const VENMO_DEEP_LINK = {
  base: "venmo://paycharge",
  webFallback: "https://venmo.com/",
};

// Trust model payment info (for deposits to NIYAH)
export const PAYMENT_INFO = {
  venmo: "@niyah-focus",
  paypal: "payments@niyah.app",
  note: "Deposit for NIYAH focus session",
};
