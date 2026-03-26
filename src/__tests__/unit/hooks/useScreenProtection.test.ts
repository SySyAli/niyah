/**
 * Unit Tests for useScreenProtection hook
 *
 * Tests screen capture prevention and app switcher protection lifecycle:
 * enable on mount, disable on unmount, key parameter forwarding.
 */

jest.mock("expo-screen-capture", () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  enableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
  disableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
}));

import { renderHook } from "@testing-library/react-native";
import * as ScreenCapture from "expo-screen-capture";
import { useScreenProtection } from "../../../hooks/useScreenProtection";

describe("useScreenProtection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls preventScreenCaptureAsync on mount", () => {
    renderHook(() => useScreenProtection("test-key"));

    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith(
      "test-key",
    );
  });

  it("calls enableAppSwitcherProtectionAsync with opacity on mount", () => {
    renderHook(() => useScreenProtection("test-key"));

    expect(ScreenCapture.enableAppSwitcherProtectionAsync).toHaveBeenCalledWith(
      0.8,
    );
  });

  it("calls allowScreenCaptureAsync on unmount", () => {
    const { unmount } = renderHook(() => useScreenProtection("deposit"));

    unmount();

    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith(
      "deposit",
    );
  });

  it("calls disableAppSwitcherProtectionAsync on unmount", () => {
    const { unmount } = renderHook(() => useScreenProtection("deposit"));

    unmount();

    expect(ScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalled();
  });

  it("passes the key parameter correctly", () => {
    const { unmount } = renderHook(() => useScreenProtection("wallet-screen"));

    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith(
      "wallet-screen",
    );

    unmount();

    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith(
      "wallet-screen",
    );
  });

  it("re-runs effect when key changes", () => {
    const { rerender, unmount } = renderHook(
      ({ key }: { key: string }) => useScreenProtection(key),
      { initialProps: { key: "key-a" } },
    );

    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith(
      "key-a",
    );

    rerender({ key: "key-b" });

    // Cleanup for old key
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith("key-a");
    // Setup for new key
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith(
      "key-b",
    );

    unmount();
  });
});
