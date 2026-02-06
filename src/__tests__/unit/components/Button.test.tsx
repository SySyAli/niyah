/**
 * Unit Tests for Button component
 *
 * Tests rendering, variants, sizes, and loading state.
 * Press handling cannot be tested in jsdom since Pressable uses
 * onPress (not onClick), so we test rendering + structure only.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../../../components/Button";

describe("Button Component", () => {
  describe("rendering", () => {
    it("renders with title text", () => {
      render(<Button title="Press Me" onPress={() => {}} />);
      expect(screen.getByText("Press Me")).toBeTruthy();
    });

    it("renders as a function component", () => {
      expect(typeof Button).toBe("function");
      expect(Button.name).toBe("Button");
    });
  });

  describe("loading state", () => {
    it("hides title when loading", () => {
      render(<Button title="Loading" onPress={() => {}} loading />);
      expect(screen.queryByText("Loading")).toBeNull();
    });

    it("shows title when not loading", () => {
      render(<Button title="Submit" onPress={() => {}} />);
      expect(screen.getByText("Submit")).toBeTruthy();
    });
  });

  describe("variants", () => {
    it.each(["primary", "secondary", "danger", "ghost", "outline"] as const)(
      "renders %s variant without error",
      (variant) => {
        render(
          <Button
            title={`${variant} btn`}
            onPress={() => {}}
            variant={variant}
          />,
        );
        expect(screen.getByText(`${variant} btn`)).toBeTruthy();
      },
    );
  });

  describe("sizes", () => {
    it.each(["small", "medium", "large"] as const)(
      "renders %s size without error",
      (size) => {
        render(<Button title={`${size} btn`} onPress={() => {}} size={size} />);
        expect(screen.getByText(`${size} btn`)).toBeTruthy();
      },
    );
  });
});
