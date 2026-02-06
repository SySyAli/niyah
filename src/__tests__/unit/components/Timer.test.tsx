/**
 * Unit Tests for Timer and InlineTimer components
 *
 * Tests time display, progress calculation, and size variants.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Timer, InlineTimer } from "../../../components/Timer";

describe("Timer Component", () => {
  describe("rendering", () => {
    it("displays formatted time (MM:SS when < 1h)", () => {
      render(<Timer timeRemaining={90000} />);
      // formatTime(90000) = "01:30" (no hours prefix when < 1h)
      expect(screen.getByText("01:30")).toBeTruthy();
    });

    it("displays progress percentage", () => {
      render(<Timer timeRemaining={50000} totalTime={100000} />);
      // 50% is split across elements ("100" + "%") -- use regex
      expect(screen.getByText("50%")).toBeTruthy();
    });

    it("displays 'Remaining' label by default", () => {
      render(<Timer timeRemaining={60000} />);
      expect(screen.getByText("Remaining")).toBeTruthy();
    });

    it("hides label when showLabel is false", () => {
      render(<Timer timeRemaining={60000} showLabel={false} />);
      expect(screen.queryByText("Remaining")).toBeNull();
    });
  });

  describe("sizes", () => {
    it.each(["small", "medium", "large"] as const)(
      "renders %s size",
      (size) => {
        render(<Timer timeRemaining={60000} size={size} />);
        expect(screen.getByText("01:00")).toBeTruthy();
      },
    );
  });

  describe("without progress ring", () => {
    it("renders simple container when showProgress is false", () => {
      render(<Timer timeRemaining={60000} showProgress={false} />);
      expect(screen.getByText("Time Remaining")).toBeTruthy();
    });
  });
});

describe("InlineTimer Component", () => {
  it("displays formatted time", () => {
    render(<InlineTimer timeRemaining={30000} />);
    expect(screen.getByText("00:30")).toBeTruthy();
  });

  it("renders zero time", () => {
    render(<InlineTimer timeRemaining={0} />);
    expect(screen.getByText("00:00")).toBeTruthy();
  });
});
