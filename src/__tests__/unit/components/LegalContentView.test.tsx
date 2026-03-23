/**
 * Unit Tests for LegalContentView component
 *
 * Tests rendering of terms and privacy sections, individually and together.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { LegalContentView } from "../../../components/LegalContentView";

describe("LegalContentView", () => {
  it("renders both sections by default", () => {
    render(<LegalContentView />);

    // Check for content from both sections
    expect(screen.getByText(/Terms of Service/)).toBeTruthy();
    expect(screen.getByText(/Privacy Policy/)).toBeTruthy();
  });

  it("renders only terms section when section='terms'", () => {
    render(<LegalContentView section="terms" />);

    expect(screen.getByText(/Terms of Service/)).toBeTruthy();
    expect(screen.queryByText(/Privacy Policy/)).toBeNull();
  });

  it("renders only privacy section when section='privacy'", () => {
    render(<LegalContentView section="privacy" />);

    expect(screen.getByText(/Privacy Policy/)).toBeTruthy();
    expect(screen.queryByText(/Terms of Service/)).toBeNull();
  });
});
