import {
  createErrorWithCode,
  getFunctionErrorMessage,
  isUserCancellationError,
} from "../../../utils/errors";

describe("errors utils", () => {
  it("creates errors with a code", () => {
    const error = createErrorWithCode(
      "Google Sign-In was cancelled",
      "SIGN_IN_CANCELLED",
    );

    expect(error.message).toBe("Google Sign-In was cancelled");
    expect(error.code).toBe("SIGN_IN_CANCELLED");
  });

  it("detects cancellation by code and message", () => {
    expect(
      isUserCancellationError(
        createErrorWithCode("Request cancelled", "ERR_REQUEST_CANCELED"),
      ),
    ).toBe(true);
    expect(
      isUserCancellationError(new Error("Google Sign-In was canceled")),
    ).toBe(true);
    expect(isUserCancellationError(new Error("Network request failed"))).toBe(
      false,
    );
  });

  it("strips Cloud Function prefixes from error messages", () => {
    const error = new Error("[createPaymentIntent] 401: Unauthorized");

    expect(getFunctionErrorMessage(error, "Fallback")).toBe("Unauthorized");
  });
});
