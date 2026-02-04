/**
 * Unit Tests for Balance.tsx
 *
 * Testing Strategy:
 * - Tests component exports
 * - Note: Full rendering tests limited due to React Native animation mocking
 */

import { describe, it, expect } from "vitest";
import {
  Balance,
  CompactBalance,
  AnimatedDigit,
} from "../../../components/Balance";

describe("Balance Components", () => {
  describe("module exports", () => {
    it("should export Balance component", () => {
      expect(Balance).toBeDefined();
      expect(typeof Balance).toBe("function");
    });

    it("should export CompactBalance component", () => {
      expect(CompactBalance).toBeDefined();
      expect(typeof CompactBalance).toBe("function");
    });

    it("should export AnimatedDigit component", () => {
      expect(AnimatedDigit).toBeDefined();
      expect(typeof AnimatedDigit).toBe("function");
    });
  });
});
