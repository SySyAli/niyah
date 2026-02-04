/**
 * Unit Tests for Card.tsx
 *
 * Testing Strategy:
 * - Tests component exports
 * - Note: Full rendering tests limited due to React Native animation mocking
 */

import { describe, it, expect } from "vitest";
import { Card } from "../../../components/Card";

describe("Card Component", () => {
  describe("module exports", () => {
    it("should export Card component", () => {
      expect(Card).toBeDefined();
      expect(typeof Card).toBe("function");
    });
  });
});
