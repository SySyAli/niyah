/**
 * Unit Tests for NumPad.tsx
 *
 * Testing Strategy:
 * - Tests component exports
 * - Note: Full rendering tests limited due to React Native animation mocking
 */

import { describe, it, expect } from "vitest";
import { NumPad, AmountDisplay } from "../../../components/NumPad";

describe("NumPad Components", () => {
  describe("module exports", () => {
    it("should export NumPad component", () => {
      expect(NumPad).toBeDefined();
      expect(typeof NumPad).toBe("function");
    });

    it("should export AmountDisplay component", () => {
      expect(AmountDisplay).toBeDefined();
      expect(typeof AmountDisplay).toBe("function");
    });
  });
});
