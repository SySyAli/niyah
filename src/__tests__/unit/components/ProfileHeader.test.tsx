/**
 * Unit Tests for ProfileHeader component
 *
 * Tests avatar initial, user info display, reputation badge coloring,
 * stat counts, and navigation on stat press.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import type { User, UserReputation } from "../../../types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const makeReputation = (
  overrides: Partial<UserReputation> = {},
): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 3,
  paymentsMissed: 1,
  totalOwedPaid: 1500,
  totalOwedMissed: 500,
  lastUpdated: new Date(),
  referralCount: 0,
  ...overrides,
});

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "test-uid",
  email: "alice@test.com",
  name: "Alice",
  balance: 5000,
  currentStreak: 3,
  longestStreak: 7,
  totalSessions: 10,
  completedSessions: 8,
  totalEarnings: 2000,
  createdAt: new Date(),
  reputation: makeReputation(),
  ...overrides,
});

describe("ProfileHeader", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("user info display", () => {
    it("renders user name and email", () => {
      render(
        <ProfileHeader
          user={makeUser()}
          followingCount={5}
          partnerCount={2}
        />,
      );
      expect(screen.getByText("Alice")).toBeTruthy();
      expect(screen.getByText("alice@test.com")).toBeTruthy();
    });

    it("shows first letter of name in avatar", () => {
      render(
        <ProfileHeader
          user={makeUser({ name: "Bob" })}
          followingCount={0}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("B")).toBeTruthy();
    });

    it("shows '?' when user is null", () => {
      render(
        <ProfileHeader user={null} followingCount={0} partnerCount={0} />,
      );
      expect(screen.getByText("?")).toBeTruthy();
    });

    it("shows '?' when user name is undefined", () => {
      // Force name to be undefined via type assertion
      const user = makeUser({ name: undefined as unknown as string });
      render(
        <ProfileHeader user={user} followingCount={0} partnerCount={0} />,
      );
      expect(screen.getByText("?")).toBeTruthy();
    });
  });

  describe("reputation badge", () => {
    it("displays reputation level label and score", () => {
      render(
        <ProfileHeader
          user={makeUser({
            reputation: makeReputation({ score: 72, level: "tree" }),
          })}
          followingCount={0}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("Tree - 72/100")).toBeTruthy();
    });

    it("defaults to 'Sapling - 50/100' when reputation is undefined", () => {
      const user = makeUser();
      // Remove reputation entirely
      (user as any).reputation = undefined;
      render(
        <ProfileHeader user={user} followingCount={0} partnerCount={0} />,
      );
      expect(screen.getByText("Sapling - 50/100")).toBeTruthy();
    });

    it("displays Oak label for oak level", () => {
      render(
        <ProfileHeader
          user={makeUser({
            reputation: makeReputation({ score: 95, level: "oak" }),
          })}
          followingCount={0}
          partnerCount={0}
        />,
      );
      expect(screen.getByText(/Oak/)).toBeTruthy();
      expect(screen.getByText(/95\/100/)).toBeTruthy();
    });

    it("displays Seed label for seed level", () => {
      render(
        <ProfileHeader
          user={makeUser({
            reputation: makeReputation({ score: 10, level: "seed" }),
          })}
          followingCount={0}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("Seed - 10/100")).toBeTruthy();
    });
  });

  describe("stats row", () => {
    it("renders following and partner counts", () => {
      render(
        <ProfileHeader
          user={makeUser()}
          followingCount={12}
          partnerCount={3}
        />,
      );
      expect(screen.getByText("12")).toBeTruthy();
      expect(screen.getByText("Following")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();
      expect(screen.getByText("Partners")).toBeTruthy();
    });

    it("renders zero counts", () => {
      render(
        <ProfileHeader
          user={makeUser()}
          followingCount={0}
          partnerCount={0}
        />,
      );
      expect(screen.getAllByText("0")).toHaveLength(2);
    });
  });

  describe("navigation on stat press", () => {
    it("navigates to friends tab with 'following' param when following is pressed", () => {
      render(
        <ProfileHeader
          user={makeUser()}
          followingCount={5}
          partnerCount={2}
        />,
      );
      fireEvent.press(screen.getByText("Following"));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(tabs)/friends",
        params: { tab: "following" },
      });
    });

    it("navigates to friends tab with 'partners' param when partners is pressed", () => {
      render(
        <ProfileHeader
          user={makeUser()}
          followingCount={5}
          partnerCount={2}
        />,
      );
      fireEvent.press(screen.getByText("Partners"));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(tabs)/friends",
        params: { tab: "partners" },
      });
    });
  });
});
