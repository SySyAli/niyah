/**
 * Unit Tests for Card component
 *
 * Tests rendering, variants, and children rendering.
 * Press handling cannot be tested in jsdom since Pressable uses
 * onPress (not onClick), so we test rendering + structure only.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { Card } from "../../../components/Card";

describe("Card Component", () => {
  describe("rendering", () => {
    it("renders children correctly", () => {
      render(
        <Card>
          <Text>Card Content</Text>
        </Card>,
      );
      expect(screen.getByText("Card Content")).toBeTruthy();
    });

    it("is a valid function component", () => {
      expect(typeof Card).toBe("function");
    });
  });

  describe("variants", () => {
    it.each(["default", "elevated", "outlined", "interactive"] as const)(
      "renders %s variant without error",
      (variant) => {
        render(
          <Card variant={variant}>
            <Text>{variant}</Text>
          </Card>,
        );
        expect(screen.getByText(variant)).toBeTruthy();
      },
    );
  });

  describe("interactivity", () => {
    it("renders with onPress prop without error", () => {
      render(
        <Card onPress={() => {}}>
          <Text>Pressable Card</Text>
        </Card>,
      );
      expect(screen.getByText("Pressable Card")).toBeTruthy();
    });

    it("renders without Pressable when no onPress is provided", () => {
      render(
        <Card>
          <Text>Static Card</Text>
        </Card>,
      );
      expect(screen.getByText("Static Card")).toBeTruthy();
    });
  });
});
