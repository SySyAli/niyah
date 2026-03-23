/**
 * Unit Tests for AuthScreenScaffold component
 *
 * Tests rendering of title, subtitle, children, back button, and footer.
 * Verifies showBack toggle and onBack callback.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { AuthScreenScaffold } from "../../../components/AuthScreenScaffold";

describe("AuthScreenScaffold", () => {
  it("renders title and subtitle", () => {
    render(
      <AuthScreenScaffold title="Welcome" subtitle="Sign in to continue">
        <Text>Body</Text>
      </AuthScreenScaffold>,
    );

    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText("Sign in to continue")).toBeTruthy();
  });

  it("renders children", () => {
    render(
      <AuthScreenScaffold>
        <Text>Child content</Text>
      </AuthScreenScaffold>,
    );

    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("renders back button when showBack=true (default)", () => {
    render(
      <AuthScreenScaffold>
        <Text>Content</Text>
      </AuthScreenScaffold>,
    );

    // Back button renders the left arrow character
    expect(screen.getByLabelText("Go back")).toBeTruthy();
    expect(screen.getByText("\u2190")).toBeTruthy();
  });

  it("hides back button when showBack=false", () => {
    render(
      <AuthScreenScaffold showBack={false}>
        <Text>Content</Text>
      </AuthScreenScaffold>,
    );

    expect(screen.queryByLabelText("Go back")).toBeNull();
    expect(screen.queryByText("\u2190")).toBeNull();
  });

  it("renders footer content", () => {
    render(
      <AuthScreenScaffold footer={<Text>Footer text</Text>}>
        <Text>Body</Text>
      </AuthScreenScaffold>,
    );

    expect(screen.getByText("Footer text")).toBeTruthy();
  });

  it("calls onBack when back button is pressed", () => {
    const onBack = jest.fn();
    render(
      <AuthScreenScaffold onBack={onBack}>
        <Text>Content</Text>
      </AuthScreenScaffold>,
    );

    fireEvent.press(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls router.back() when back is pressed with no onBack prop", () => {
    const mockBack = jest.fn();
    jest.mocked(useRouter).mockReturnValue({
      back: mockBack,
      push: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => true),
    } as any);

    render(
      <AuthScreenScaffold>
        <Text>Content</Text>
      </AuthScreenScaffold>,
    );

    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
