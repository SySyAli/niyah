/**
 * Unit Tests for NumPad and AmountDisplay components
 *
 * Tests key rendering and amount display.
 * Press handling cannot be fully tested in jsdom since Pressable uses
 * onPress (not onClick), so we focus on rendering verification.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NumPad, AmountDisplay } from "../../../components/NumPad";

describe("NumPad Component", () => {
  describe("rendering", () => {
    it("renders all digit keys 0-9", () => {
      render(<NumPad onKeyPress={() => {}} onBackspace={() => {}} />);
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(String(i))).toBeTruthy();
      }
    });

    it("renders delete key", () => {
      render(<NumPad onKeyPress={() => {}} onBackspace={() => {}} />);
      expect(screen.getByText("Delete")).toBeTruthy();
    });

    it("renders decimal key when showDecimal is true", () => {
      render(
        <NumPad onKeyPress={() => {}} onBackspace={() => {}} showDecimal />,
      );
      expect(screen.getByText(".")).toBeTruthy();
    });

    it("does not render decimal key by default", () => {
      render(<NumPad onKeyPress={() => {}} onBackspace={() => {}} />);
      expect(screen.queryByText(".")).toBeNull();
    });
  });
});

describe("AmountDisplay Component", () => {
  it("displays placeholder when amount is empty", () => {
    render(<AmountDisplay amount="" />);
    expect(screen.getByText("$0")).toBeTruthy();
  });

  it("displays custom placeholder", () => {
    render(<AmountDisplay amount="" placeholder="Enter amount" />);
    expect(screen.getByText("Enter amount")).toBeTruthy();
  });

  it("displays label when provided", () => {
    render(<AmountDisplay amount="$10" label="Stake Amount" />);
    expect(screen.getByText("Stake Amount")).toBeTruthy();
    expect(screen.getByText("$10")).toBeTruthy();
  });
});
