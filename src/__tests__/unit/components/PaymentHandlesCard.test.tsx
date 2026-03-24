/**
 * Unit Tests for PaymentHandlesCard component
 *
 * Tests display mode (handles shown, placeholders), edit mode toggle,
 * input behavior, save with @ prefix logic, and cancel reset.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaymentHandlesCard } from "../../../components/profile/PaymentHandlesCard";

describe("PaymentHandlesCard", () => {
  const defaultProps = {
    onSaveVenmo: jest.fn(),
    onSaveZelle: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onSaveVenmo.mockClear();
    defaultProps.onSaveZelle.mockClear();
  });

  describe("display mode", () => {
    it("renders title and Edit button", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      expect(screen.getByText("Payment Handles")).toBeTruthy();
      expect(screen.getByText("Edit")).toBeTruthy();
    });

    it("shows placeholders when no handles are provided", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      expect(screen.getAllByText("Tap Edit to add")).toHaveLength(2);
      expect(screen.getByText("Venmo")).toBeTruthy();
      expect(screen.getByText("Zelle")).toBeTruthy();
    });

    it("shows note text about partner payments", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      expect(
        screen.getByText("Partners can pay you with either option"),
      ).toBeTruthy();
    });

    it("shows venmo handle when provided", () => {
      render(
        <PaymentHandlesCard {...defaultProps} venmoHandle="@alice-pay" />,
      );
      expect(screen.getByText("@alice-pay")).toBeTruthy();
      // Only Zelle should show placeholder
      expect(screen.getAllByText("Tap Edit to add")).toHaveLength(1);
    });

    it("shows zelle handle when provided", () => {
      render(
        <PaymentHandlesCard
          {...defaultProps}
          zelleHandle="alice@email.com"
        />,
      );
      expect(screen.getByText("alice@email.com")).toBeTruthy();
      // Only Venmo should show placeholder
      expect(screen.getAllByText("Tap Edit to add")).toHaveLength(1);
    });

    it("shows both handles when both are provided", () => {
      render(
        <PaymentHandlesCard
          {...defaultProps}
          venmoHandle="@bob"
          zelleHandle="555-1234"
        />,
      );
      expect(screen.getByText("@bob")).toBeTruthy();
      expect(screen.getByText("555-1234")).toBeTruthy();
      expect(screen.queryByText("Tap Edit to add")).toBeNull();
    });
  });

  describe("edit mode toggle", () => {
    it("switches to editor when Edit is pressed", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));

      // Editor should show input labels, Save and Cancel buttons
      expect(screen.getByText("Venmo Handle")).toBeTruthy();
      expect(screen.getByText("Save")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    it("hides Edit button when in editor mode", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));
      expect(screen.queryByText("Edit")).toBeNull();
    });

    it("hides note text when in editor mode", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));
      expect(
        screen.queryByText("Partners can pay you with either option"),
      ).toBeNull();
    });
  });

  describe("save behavior", () => {
    it("calls onSaveVenmo with @ prefix and onSaveZelle on Save", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));

      const [venmoInput, zelleInput] = screen.getAllByDisplayValue("");
      fireEvent.changeText(venmoInput, "alice-pay");
      fireEvent.changeText(zelleInput, "alice@email.com");
      fireEvent.press(screen.getByText("Save"));

      expect(defaultProps.onSaveVenmo).toHaveBeenCalledWith("@alice-pay");
      expect(defaultProps.onSaveZelle).toHaveBeenCalledWith("alice@email.com");
    });

    it("does not double-prefix @ if already present", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));

      const [venmoInput] = screen.getAllByDisplayValue("");
      fireEvent.changeText(venmoInput, "@alice-pay");
      fireEvent.press(screen.getByText("Save"));

      expect(defaultProps.onSaveVenmo).toHaveBeenCalledWith("@alice-pay");
    });

    it("saves empty string when venmo input is blank", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));
      fireEvent.press(screen.getByText("Save"));

      expect(defaultProps.onSaveVenmo).toHaveBeenCalledWith("");
      expect(defaultProps.onSaveZelle).toHaveBeenCalledWith("");
    });

    it("trims whitespace from inputs", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));

      const [venmoInput, zelleInput] = screen.getAllByDisplayValue("");
      fireEvent.changeText(venmoInput, "  bob  ");
      fireEvent.changeText(zelleInput, "  bob@mail.com  ");
      fireEvent.press(screen.getByText("Save"));

      expect(defaultProps.onSaveVenmo).toHaveBeenCalledWith("@bob");
      expect(defaultProps.onSaveZelle).toHaveBeenCalledWith("bob@mail.com");
    });

    it("returns to display mode after save", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));
      fireEvent.press(screen.getByText("Save"));

      // Should be back in display mode
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.queryByText("Save")).toBeNull();
    });
  });

  describe("cancel behavior", () => {
    it("returns to display mode on cancel", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));
      fireEvent.press(screen.getByText("Cancel"));

      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.queryByText("Save")).toBeNull();
    });

    it("does not call save callbacks on cancel", () => {
      render(<PaymentHandlesCard {...defaultProps} />);
      fireEvent.press(screen.getByText("Edit"));

      const [venmoInput] = screen.getAllByDisplayValue("");
      fireEvent.changeText(venmoInput, "modified");
      fireEvent.press(screen.getByText("Cancel"));

      expect(defaultProps.onSaveVenmo).not.toHaveBeenCalled();
      expect(defaultProps.onSaveZelle).not.toHaveBeenCalled();
    });

    it("resets inputs to original prop values on cancel", () => {
      render(
        <PaymentHandlesCard
          {...defaultProps}
          venmoHandle="@original"
          zelleHandle="original@mail.com"
        />,
      );
      fireEvent.press(screen.getByText("Edit"));

      // Modify inputs
      const venmoInput = screen.getByDisplayValue("@original");
      fireEvent.changeText(venmoInput, "changed");

      // Cancel
      fireEvent.press(screen.getByText("Cancel"));

      // Re-enter edit mode - inputs should be reset
      fireEvent.press(screen.getByText("Edit"));
      expect(screen.getByDisplayValue("@original")).toBeTruthy();
    });
  });

  describe("editor pre-filled values", () => {
    it("pre-fills inputs with existing handles", () => {
      render(
        <PaymentHandlesCard
          {...defaultProps}
          venmoHandle="@alice"
          zelleHandle="alice@mail.com"
        />,
      );
      fireEvent.press(screen.getByText("Edit"));

      expect(screen.getByDisplayValue("@alice")).toBeTruthy();
      expect(screen.getByDisplayValue("alice@mail.com")).toBeTruthy();
    });
  });
});
