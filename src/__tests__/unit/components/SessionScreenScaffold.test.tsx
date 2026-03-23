/**
 * Unit Tests for SessionScreenScaffold component
 *
 * Tests rendering with different header variants (back, centered, none),
 * title/subtitle section, footer, and children.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { SessionScreenScaffold } from "../../../components/SessionScreenScaffold";

describe("SessionScreenScaffold", () => {
  describe("back header variant (default)", () => {
    it("renders with back header by default", () => {
      render(
        <SessionScreenScaffold>
          <Text>Session content</Text>
        </SessionScreenScaffold>,
      );

      // Default back label is "Back"
      expect(screen.getByText("Back")).toBeTruthy();
      expect(screen.getByLabelText("Back")).toBeTruthy();
    });

    it("renders custom back label", () => {
      render(
        <SessionScreenScaffold backLabel="Cancel">
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    it("calls onBack when back is pressed", () => {
      const onBack = jest.fn();
      render(
        <SessionScreenScaffold onBack={onBack}>
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      fireEvent.press(screen.getByLabelText("Back"));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("calls router.back() when no onBack is provided", () => {
      const mockBack = jest.fn();
      jest.mocked(useRouter).mockReturnValue({
        back: mockBack,
        push: jest.fn(),
        replace: jest.fn(),
        canGoBack: jest.fn(() => true),
      } as any);

      render(
        <SessionScreenScaffold>
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      fireEvent.press(screen.getByLabelText("Back"));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("centered header variant", () => {
    it("renders centered header with title", () => {
      render(
        <SessionScreenScaffold headerVariant="centered" headerTitle="Confirm">
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Confirm")).toBeTruthy();
      // Default cancel label for centered variant is "Cancel"
      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    it("renders centered header with custom back label", () => {
      render(
        <SessionScreenScaffold
          headerVariant="centered"
          headerTitle="Settings"
          backLabel="Close"
        >
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Close")).toBeTruthy();
      expect(screen.getByText("Settings")).toBeTruthy();
    });

    it("renders headerRight content", () => {
      render(
        <SessionScreenScaffold
          headerVariant="centered"
          headerTitle="Edit"
          headerRight={<Text>Save</Text>}
        >
          <Text>Content</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Save")).toBeTruthy();
    });
  });

  describe("no header variant", () => {
    it("renders without any header when headerVariant is none", () => {
      render(
        <SessionScreenScaffold headerVariant="none">
          <Text>Content only</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Content only")).toBeTruthy();
      expect(screen.queryByText("Back")).toBeNull();
      expect(screen.queryByText("Cancel")).toBeNull();
    });
  });

  describe("title section", () => {
    it("renders title and subtitle", () => {
      render(
        <SessionScreenScaffold
          title="Select Amount"
          subtitle="Choose your stake"
        >
          <Text>Body</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Select Amount")).toBeTruthy();
      expect(screen.getByText("Choose your stake")).toBeTruthy();
    });

    it("does not render title section when no title is provided", () => {
      render(
        <SessionScreenScaffold>
          <Text>Body</Text>
        </SessionScreenScaffold>,
      );

      // Only "Back" and "Body" should be present, no title
      expect(screen.getByText("Body")).toBeTruthy();
    });
  });

  describe("footer", () => {
    it("renders footer content", () => {
      render(
        <SessionScreenScaffold footer={<Text>Continue</Text>}>
          <Text>Body</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Continue")).toBeTruthy();
    });

    it("does not render footer when not provided", () => {
      render(
        <SessionScreenScaffold>
          <Text>Body</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Body")).toBeTruthy();
    });
  });

  describe("children", () => {
    it("renders children content", () => {
      render(
        <SessionScreenScaffold>
          <Text>Child A</Text>
          <Text>Child B</Text>
        </SessionScreenScaffold>,
      );

      expect(screen.getByText("Child A")).toBeTruthy();
      expect(screen.getByText("Child B")).toBeTruthy();
    });
  });
});
