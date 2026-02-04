// Session configurations
export const CADENCES = {
  daily: {
    id: "daily",
    name: "Daily",
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    demoDuration: 30 * 1000, // 30 seconds for demo
    stake: 500, // $5.00 in cents
    basePayout: 1000, // $10.00 in cents
    streakBonuses: [
      { days: 5, multiplier: 1.25 },
      { days: 10, multiplier: 1.5 },
    ],
  },
  weekly: {
    id: "weekly",
    name: "Weekly",
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    demoDuration: 60 * 1000, // 60 seconds for demo
    stake: 2500, // $25.00 in cents
    basePayout: 6000, // $60.00 in cents
    streakBonuses: [
      { weeks: 4, multiplier: 1.5 },
      { weeks: 8, multiplier: 2.0 },
    ],
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    demoDuration: 90 * 1000, // 90 seconds for demo
    stake: 10000, // $100.00 in cents
    basePayout: 26000, // $260.00 in cents
    streakBonuses: [
      { months: 3, multiplier: 2.0 },
      { months: 6, multiplier: 3.0 },
    ],
  },
} as const;

export type CadenceId = keyof typeof CADENCES;

// Demo mode settings
export const DEMO_MODE = true;
export const INITIAL_BALANCE = 5000; // $50.00 in cents

// Trust model payment info
export const PAYMENT_INFO = {
  venmo: "@niyah-focus",
  paypal: "payments@niyah.app",
  note: "Deposit for NIYAH focus session",
};
