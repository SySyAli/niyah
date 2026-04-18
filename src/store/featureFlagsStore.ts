import { create } from "zustand";
import { getFirestore, doc, onSnapshot } from "@react-native-firebase/firestore";
import { logger } from "../utils/logger";

// Server-controlled kill switches. Fail open (all true) until Firestore
// snapshot arrives so a network hiccup doesn't lock users out; once we've
// read the doc, respect whatever it says. A toggle in Firestore takes
// effect live via onSnapshot without requiring an app rebuild.
export interface FeatureFlags {
  acceptingDeposits: boolean;
  acceptingWithdrawals: boolean;
  groupSessionsEnabled: boolean;
  soloSessionsEnabled: boolean;
}

const DEFAULTS: FeatureFlags = {
  acceptingDeposits: true,
  acceptingWithdrawals: true,
  groupSessionsEnabled: true,
  soloSessionsEnabled: true,
};

interface FeatureFlagsState {
  flags: FeatureFlags;
  loaded: boolean;
  subscribe: () => () => void;
  reset: () => void;
}

let _unsub: (() => void) | null = null;

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  flags: DEFAULTS,
  loaded: false,

  subscribe: () => {
    if (_unsub) return _unsub;
    const db = getFirestore();
    const flagsDoc = doc(db, "config", "featureFlags");
    _unsub = onSnapshot(
      flagsDoc,
      (snapshot) => {
        const data = snapshot.data() as Partial<FeatureFlags> | undefined;
        set({
          flags: {
            acceptingDeposits:
              data?.acceptingDeposits ?? DEFAULTS.acceptingDeposits,
            acceptingWithdrawals:
              data?.acceptingWithdrawals ?? DEFAULTS.acceptingWithdrawals,
            groupSessionsEnabled:
              data?.groupSessionsEnabled ?? DEFAULTS.groupSessionsEnabled,
            soloSessionsEnabled:
              data?.soloSessionsEnabled ?? DEFAULTS.soloSessionsEnabled,
          },
          loaded: true,
        });
      },
      (err) => {
        // Permission denied or network error — stay on defaults (fail-open)
        logger.warn("Feature flags subscription error:", err);
      },
    );
    return _unsub;
  },

  reset: () => {
    if (_unsub) {
      _unsub();
      _unsub = null;
    }
    set({ flags: DEFAULTS, loaded: false });
  },
}));
