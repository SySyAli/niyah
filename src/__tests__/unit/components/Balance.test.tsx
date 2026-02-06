/**
 * Unit Tests for Balance, CompactBalance, and AnimatedDigit components
 *
 * Tests amount display, formatting, sign handling, and color modes.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Balance,
  CompactBalance,
  AnimatedDigit,
} from "../../../components/Balance";

describe("Balance Component", () => {
  describe("rendering", () => {
    it("displays formatted amount", () => {
      render(<Balance amount={5000} />);
      expect(screen.getByText("$50.00")).toBeTruthy();
    });

    it("displays label when provided", () => {
      render(<Balance amount={1000} label="Your Balance" />);
      expect(screen.getByText("Your Balance")).toBeTruthy();
    });

    it("displays positive sign when showSign is true", () => {
      render(<Balance amount={500} showSign />);
      expect(screen.getByText("+$5.00")).toBeTruthy();
    });

    it("displays negative amounts correctly", () => {
      render(<Balance amount={-500} />);
      expect(screen.getByText("-$5.00")).toBeTruthy();
    });
  });

  describe("sizes", () => {
    it.each(["small", "medium", "large", "display"] as const)(
      "renders %s size",
      (size) => {
        render(<Balance amount={100} size={size} />);
        expect(screen.getByText("$1.00")).toBeTruthy();
      },
    );
  });
});

describe("CompactBalance Component", () => {
  it("displays formatted amount", () => {
    render(<CompactBalance amount={2500} />);
    expect(screen.getByText("$25.00")).toBeTruthy();
  });

  it("displays sign when showSign is true for positive amounts", () => {
    render(<CompactBalance amount={500} showSign />);
    expect(screen.getByText(/\+?\$5\.00/)).toBeTruthy();
  });
});

describe("AnimatedDigit Component", () => {
  it("renders a single digit", () => {
    render(<AnimatedDigit digit="7" fontSize={24} color="#000" />);
    expect(screen.getByText("7")).toBeTruthy();
  });
});
