/**
 * Unit Tests for ScreenTimeCard component
 *
 * Tests rendering based on Screen Time availability, authorization states,
 * app selection count, button text, and the Ready badge.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

// --- Mocks for the screentime config module ---
const mockIsScreenTimeAvailable = { value: true };
const mockGetScreenTimeAuthStatus = jest.fn(() => "notDetermined" as const);
const mockGetSavedAppSelection = jest.fn(
  () => null as { appCount: number } | null,
);
const mockRequestScreenTimeAuth = jest.fn();
const mockPresentAppPicker = jest.fn();

jest.mock("../../../config/screentime", () => ({
  get isScreenTimeAvailable() {
    return mockIsScreenTimeAvailable.value;
  },
  getScreenTimeAuthStatus: (...args: any[]) =>
    mockGetScreenTimeAuthStatus(...args),
  getSavedAppSelection: (...args: any[]) => mockGetSavedAppSelection(...args),
  requestScreenTimeAuth: (...args: any[]) => mockRequestScreenTimeAuth(...args),
  presentAppPicker: (...args: any[]) => mockPresentAppPicker(...args),
}));

import { ScreenTimeCard } from "../../../components/profile/ScreenTimeCard";

describe("ScreenTimeCard", () => {
  beforeEach(() => {
    mockIsScreenTimeAvailable.value = true;
    mockGetScreenTimeAuthStatus.mockReturnValue("notDetermined");
    mockGetSavedAppSelection.mockReturnValue(null);
    mockRequestScreenTimeAuth.mockReset();
    mockPresentAppPicker.mockReset();
  });

  describe("availability", () => {
    it("renders nothing when Screen Time is not available", () => {
      mockIsScreenTimeAvailable.value = false;
      const { toJSON } = render(<ScreenTimeCard />);
      expect(toJSON()).toBeNull();
    });

    it("renders the card when Screen Time is available", () => {
      render(<ScreenTimeCard />);
      expect(screen.getByText("Screen Time")).toBeTruthy();
    });
  });

  describe("not authorized state", () => {
    it("shows 'Enable Screen Time' button when not determined", () => {
      render(<ScreenTimeCard />);
      expect(screen.getByText("Enable Screen Time")).toBeTruthy();
      expect(
        screen.getByText(
          "Allow NIYAH to block distracting apps during sessions",
        ),
      ).toBeTruthy();
    });

    it("shows 'Enable Screen Time' button when denied", () => {
      mockGetScreenTimeAuthStatus.mockReturnValue("denied");
      render(<ScreenTimeCard />);
      expect(screen.getByText("Enable Screen Time")).toBeTruthy();
    });

    it("calls requestScreenTimeAuth when enable button is pressed", async () => {
      mockRequestScreenTimeAuth.mockResolvedValue("approved");
      render(<ScreenTimeCard />);

      await act(async () => {
        fireEvent.press(screen.getByText("Enable Screen Time"));
      });

      expect(mockRequestScreenTimeAuth).toHaveBeenCalled();
    });

    it("transitions to approved state after successful auth", async () => {
      mockRequestScreenTimeAuth.mockResolvedValue("approved");
      render(<ScreenTimeCard />);

      await act(async () => {
        fireEvent.press(screen.getByText("Enable Screen Time"));
      });

      // After approval, should show "Select Apps" instead of "Enable Screen Time"
      expect(screen.getByText("Select Apps")).toBeTruthy();
      expect(screen.queryByText("Enable Screen Time")).toBeNull();
    });
  });

  describe("approved state - no apps selected", () => {
    beforeEach(() => {
      mockGetScreenTimeAuthStatus.mockReturnValue("approved");
      mockGetSavedAppSelection.mockReturnValue(null);
    });

    it("shows 'Select Apps' button", () => {
      render(<ScreenTimeCard />);
      expect(screen.getByText("Select Apps")).toBeTruthy();
    });

    it("shows description prompting to select apps", () => {
      render(<ScreenTimeCard />);
      expect(
        screen.getByText("Select which apps to block during sessions"),
      ).toBeTruthy();
    });

    it("does not show the Ready badge", () => {
      render(<ScreenTimeCard />);
      expect(screen.queryByText("Ready")).toBeNull();
    });
  });

  describe("approved state - apps selected", () => {
    beforeEach(() => {
      mockGetScreenTimeAuthStatus.mockReturnValue("approved");
      mockGetSavedAppSelection.mockReturnValue({ appCount: 5 });
    });

    it("shows 'Change Apps' button when apps are selected", () => {
      render(<ScreenTimeCard />);
      expect(screen.getByText("Change Apps")).toBeTruthy();
    });

    it("shows app count in description (plural)", () => {
      render(<ScreenTimeCard />);
      expect(
        screen.getByText("5 apps will be blocked during sessions"),
      ).toBeTruthy();
    });

    it("shows singular form for 1 app", () => {
      mockGetSavedAppSelection.mockReturnValue({ appCount: 1 });
      render(<ScreenTimeCard />);
      expect(
        screen.getByText("1 app will be blocked during sessions"),
      ).toBeTruthy();
    });

    it("shows the Ready badge", () => {
      render(<ScreenTimeCard />);
      expect(screen.getByText("Ready")).toBeTruthy();
    });
  });

  describe("app picker interaction", () => {
    beforeEach(() => {
      mockGetScreenTimeAuthStatus.mockReturnValue("approved");
      mockGetSavedAppSelection.mockReturnValue(null);
    });

    it("calls presentAppPicker when Select Apps is pressed", async () => {
      mockPresentAppPicker.mockResolvedValue({ appCount: 3 });
      render(<ScreenTimeCard />);

      await act(async () => {
        fireEvent.press(screen.getByText("Select Apps"));
      });

      expect(mockPresentAppPicker).toHaveBeenCalled();
    });

    it("updates app count after picker returns", async () => {
      mockPresentAppPicker.mockResolvedValue({ appCount: 3 });
      render(<ScreenTimeCard />);

      await act(async () => {
        fireEvent.press(screen.getByText("Select Apps"));
      });

      expect(
        screen.getByText("3 apps will be blocked during sessions"),
      ).toBeTruthy();
      expect(screen.getByText("Change Apps")).toBeTruthy();
      expect(screen.getByText("Ready")).toBeTruthy();
    });

    it("handles picker cancellation gracefully", async () => {
      mockPresentAppPicker.mockRejectedValue(new Error("User cancelled"));
      render(<ScreenTimeCard />);

      await act(async () => {
        fireEvent.press(screen.getByText("Select Apps"));
      });

      // Should remain in the same state - no crash, still shows Select Apps
      expect(screen.getByText("Select Apps")).toBeTruthy();
    });
  });
});
