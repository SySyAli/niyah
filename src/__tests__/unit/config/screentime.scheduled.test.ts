/**
 * Tests for scheduled blocking functions added to screentime.ts:
 *   - startScheduledBlocking
 *   - stopScheduledBlocking
 *   - stopAllScheduledBlocking
 */

let mockPlatformOS = "ios";
let mockPlatformVersion = "16.0";

const mockNativeModule = {
  requestAuthorization: jest.fn(() => Promise.resolve("approved")),
  getAuthorizationStatus: jest.fn(() => "approved"),
  presentAppPicker: jest.fn(() =>
    Promise.resolve({
      id: "x",
      appCount: 3,
      categoryCount: 0,
      label: "3 apps",
    }),
  ),
  getSavedSelection: jest.fn(() => null),
  clearSelection: jest.fn(() => Promise.resolve()),
  startBlocking: jest.fn(() => Promise.resolve()),
  stopBlocking: jest.fn(() => Promise.resolve()),
  isBlocking: jest.fn(() => false),
  startScheduledBlocking: jest.fn(() => Promise.resolve()),
  stopScheduledBlocking: jest.fn(() => Promise.resolve()),
  stopAllScheduledBlocking: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};

function resetNativeMocks() {
  Object.values(mockNativeModule).forEach((fn) =>
    (fn as jest.Mock).mockClear(),
  );
  mockNativeModule.startScheduledBlocking.mockImplementation(() =>
    Promise.resolve(),
  );
  mockNativeModule.stopScheduledBlocking.mockImplementation(() =>
    Promise.resolve(),
  );
  mockNativeModule.stopAllScheduledBlocking.mockImplementation(() =>
    Promise.resolve(),
  );
}

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    __esModule: true,
    Platform: new Proxy(actual.Platform, {
      get(_target: unknown, prop: string) {
        if (prop === "OS") return mockPlatformOS;
        if (prop === "Version") return mockPlatformVersion;
        return (actual.Platform as Record<string, unknown>)[prop];
      },
    }),
  };
});

jest.mock("../../../../modules/niyah-screentime", () => ({
  NiyahScreenTime: mockNativeModule,
}));

function loadModule() {
  let mod: typeof import("../../../config/screentime");
  jest.isolateModules(() => {
    mod = require("../../../config/screentime");
  });
  return mod!;
}

describe("screentime scheduled blocking", () => {
  beforeEach(() => {
    resetNativeMocks();
    mockPlatformOS = "ios";
    mockPlatformVersion = "16.0";
  });

  describe("when Screen Time is available (iOS 16+)", () => {
    let st: ReturnType<typeof loadModule>;

    beforeEach(() => {
      st = loadModule();
    });

    it("startScheduledBlocking delegates all params to native", async () => {
      await st.startScheduledBlocking(9, 0, 17, 0, "work-session");

      expect(mockNativeModule.startScheduledBlocking).toHaveBeenCalledWith(
        9,
        0,
        17,
        0,
        "work-session",
      );
    });

    it("stopScheduledBlocking delegates activity name to native", async () => {
      await st.stopScheduledBlocking("work-session");

      expect(mockNativeModule.stopScheduledBlocking).toHaveBeenCalledWith(
        "work-session",
      );
    });

    it("stopAllScheduledBlocking calls native with no args", async () => {
      await st.stopAllScheduledBlocking();

      expect(mockNativeModule.stopAllScheduledBlocking).toHaveBeenCalled();
    });

    it("propagates native errors from startScheduledBlocking", async () => {
      mockNativeModule.startScheduledBlocking.mockRejectedValue(
        new Error("DeviceActivityCenter error"),
      );

      await expect(
        st.startScheduledBlocking(9, 0, 17, 0, "bad-schedule"),
      ).rejects.toThrow("DeviceActivityCenter error");
    });

    it("propagates native errors from stopScheduledBlocking", async () => {
      mockNativeModule.stopScheduledBlocking.mockRejectedValue(
        new Error("not monitoring"),
      );

      await expect(st.stopScheduledBlocking("nonexistent")).rejects.toThrow(
        "not monitoring",
      );
    });
  });

  describe("when Screen Time is unavailable (Android)", () => {
    let st: ReturnType<typeof loadModule>;

    beforeEach(() => {
      mockPlatformOS = "android";
      st = loadModule();
    });

    it("startScheduledBlocking is a no-op", async () => {
      await st.startScheduledBlocking(9, 0, 17, 0, "work");
      expect(mockNativeModule.startScheduledBlocking).not.toHaveBeenCalled();
    });

    it("stopScheduledBlocking is a no-op", async () => {
      await st.stopScheduledBlocking("work");
      expect(mockNativeModule.stopScheduledBlocking).not.toHaveBeenCalled();
    });

    it("stopAllScheduledBlocking is a no-op", async () => {
      await st.stopAllScheduledBlocking();
      expect(mockNativeModule.stopAllScheduledBlocking).not.toHaveBeenCalled();
    });
  });
});
