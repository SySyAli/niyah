/**
 * Unit Tests for ReputationCard component
 *
 * Tests title, description, progress bar labels, payment stats display,
 * and default values when reputation is undefined.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ReputationCard } from "../../../components/profile/ReputationCard";
import type { UserReputation } from "../../../types";

const makeReputation = (
  overrides: Partial<UserReputation> = {},
): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 5,
  paymentsMissed: 2,
  totalOwedPaid: 2500,
  totalOwedMissed: 1000,
  lastUpdated: new Date(),
  referralCount: 3,
  ...overrides,
});

describe("ReputationCard", () => {
  describe("header", () => {
    it("renders 'Social Credit' title", () => {
      render(
        <ReputationCard reputation={makeReputation()} partnerCount={2} />,
      );
      expect(screen.getByText("Social Credit")).toBeTruthy();
    });

    it("shows description matching the reputation level", () => {
      render(
        <ReputationCard
          reputation={makeReputation({ level: "oak" })}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("Pillar of the community")).toBeTruthy();
    });

    it("shows 'Reliable partner' for sapling level", () => {
      render(
        <ReputationCard
          reputation={makeReputation({ level: "sapling" })}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("Reliable partner")).toBeTruthy();
    });

    it("shows 'Growing trust' for sprout level", () => {
      render(
        <ReputationCard
          reputation={makeReputation({ level: "sprout" })}
          partnerCount={0}
        />,
      );
      expect(screen.getByText("Growing trust")).toBeTruthy();
    });

    it("defaults to sapling description when reputation is undefined", () => {
      render(<ReputationCard reputation={undefined} partnerCount={0} />);
      // When reputation is undefined, level defaults to "sapling" which has description "Reliable partner"
      expect(screen.getByText("Reliable partner")).toBeTruthy();
    });
  });

  describe("progress bar labels", () => {
    it("renders Seed and Oak labels", () => {
      render(
        <ReputationCard reputation={makeReputation()} partnerCount={0} />,
      );
      expect(screen.getByText("Seed")).toBeTruthy();
      expect(screen.getByText("Oak")).toBeTruthy();
    });
  });

  describe("payment stats", () => {
    it("displays paymentsCompleted, paymentsMissed, partnerCount, and referralCount", () => {
      render(
        <ReputationCard
          reputation={makeReputation({
            paymentsCompleted: 10,
            paymentsMissed: 1,
            referralCount: 4,
          })}
          partnerCount={3}
        />,
      );
      expect(screen.getByText("10")).toBeTruthy(); // Paid
      expect(screen.getByText("1")).toBeTruthy(); // Missed
      expect(screen.getByText("3")).toBeTruthy(); // Partners
      expect(screen.getByText("4")).toBeTruthy(); // Referred

      expect(screen.getByText("Paid")).toBeTruthy();
      expect(screen.getByText("Missed")).toBeTruthy();
      expect(screen.getByText("Partners")).toBeTruthy();
      expect(screen.getByText("Referred")).toBeTruthy();
    });

    it("defaults all stats to 0 when reputation is undefined", () => {
      render(<ReputationCard reputation={undefined} partnerCount={0} />);
      // paymentsCompleted, paymentsMissed, partnerCount, referralCount all 0
      expect(screen.getAllByText("0")).toHaveLength(4);
    });

    it("defaults referralCount to 0 when not provided", () => {
      const rep = makeReputation({ referralCount: undefined });
      render(<ReputationCard reputation={rep} partnerCount={1} />);
      // referralCount || 0 should show "0"
      // paymentsCompleted=5, paymentsMissed=2, partnerCount=1, referralCount=0
      expect(screen.getByText("5")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
      expect(screen.getByText("1")).toBeTruthy();
      // The 0 is from referralCount
      expect(screen.getByText("0")).toBeTruthy();
    });
  });
});
