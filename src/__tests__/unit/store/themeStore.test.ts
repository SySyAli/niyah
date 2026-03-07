/**
 * Unit Tests for themeStore.ts
 *
 * Tests the persisted theme store: initial state, toggle, explicit set,
 * and hydration flag. Covers the two previously-uncovered action lines.
 */

import { useThemeStore } from "../../../store/themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    // Reset to a known baseline; device default is "dark" in the test env
    // because Appearance.getColorScheme() returns null → falls back to "dark"
    useThemeStore.setState({ theme: "dark", _hasHydrated: false });
  });

  describe("initial state", () => {
    it("has a valid theme value on startup", () => {
      const { theme } = useThemeStore.getState();
      expect(["dark", "light"]).toContain(theme);
    });

    it("starts with _hasHydrated false", () => {
      expect(useThemeStore.getState()._hasHydrated).toBe(false);
    });
  });

  // ─── toggleTheme ─────────────────────────────────────────────────────────────

  describe("toggleTheme", () => {
    it("switches from dark to light", () => {
      useThemeStore.setState({ theme: "dark" });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe("light");
    });

    it("switches from light to dark", () => {
      useThemeStore.setState({ theme: "light" });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe("dark");
    });

    it("returns to original theme after two toggles", () => {
      const initial = useThemeStore.getState().theme;
      useThemeStore.getState().toggleTheme();
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe(initial);
    });
  });

  // ─── setTheme ────────────────────────────────────────────────────────────────

  describe("setTheme", () => {
    it("sets theme to light explicitly", () => {
      useThemeStore.setState({ theme: "dark" });
      useThemeStore.getState().setTheme("light");
      expect(useThemeStore.getState().theme).toBe("light");
    });

    it("sets theme to dark explicitly", () => {
      useThemeStore.setState({ theme: "light" });
      useThemeStore.getState().setTheme("dark");
      expect(useThemeStore.getState().theme).toBe("dark");
    });

    it("is idempotent when setting the same theme", () => {
      useThemeStore.setState({ theme: "dark" });
      useThemeStore.getState().setTheme("dark");
      expect(useThemeStore.getState().theme).toBe("dark");
    });
  });

  // ─── setHasHydrated ──────────────────────────────────────────────────────────

  describe("setHasHydrated", () => {
    it("sets _hasHydrated to true", () => {
      expect(useThemeStore.getState()._hasHydrated).toBe(false);
      useThemeStore.getState().setHasHydrated(true);
      expect(useThemeStore.getState()._hasHydrated).toBe(true);
    });

    it("can be reset to false", () => {
      useThemeStore.setState({ _hasHydrated: true });
      useThemeStore.getState().setHasHydrated(false);
      expect(useThemeStore.getState()._hasHydrated).toBe(false);
    });
  });

  // ─── Integration ─────────────────────────────────────────────────────────────

  describe("theme + hydration interaction", () => {
    it("theme changes do not affect _hasHydrated", () => {
      useThemeStore.getState().setHasHydrated(true);
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState()._hasHydrated).toBe(true);
    });
  });
});
