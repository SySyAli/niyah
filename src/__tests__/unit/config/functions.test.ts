/**
 * functions.ts — Unit Tests
 *
 * Tests the Cloud Function HTTP wrapper (`callFunction`) and all exported
 * wrapper functions. Verifies:
 * - Correct URL construction (base URL + function name)
 * - Authorization header included when user is logged in, omitted otherwise
 * - Error handling for non-OK responses and network failures
 * - Graceful handling of getIdToken() failures
 * - Each exported function passes the correct function name and body
 *
 * Note: FUNCTIONS_BASE is a top-level `const` evaluated at module load time.
 * Because Babel hoists `import` statements above assignments like
 * `process.env.X = "..."`, static imports always see the env vars as they
 * were when jest.setup.ts finished. For URL-specific assertions we extract
 * the actual base from the first fetch call.  A dedicated test using
 * `jest.resetModules()` + dynamic `require()` verifies the env-var-driven
 * URL template independently.
 */

import { getAuth } from "@react-native-firebase/auth";

import {
  createPaymentIntent,
  verifyAndCreditDeposit,
  handleSessionComplete,
  handleSessionForfeit,
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  requestWithdrawal,
  awardReferral,
  followUserCF,
  unfollowUserCF,
  acceptLegalTerms,
  distributeGroupPayouts,
  createGroupSession,
  respondToGroupInvite,
  markOnlineForSession,
  startGroupSessionCF,
  reportSessionStatus,
  cancelGroupSession,
} from "../../../config/functions";

// ─── Mock helpers ───────────────────────────────────────────────────────────

const mockGetIdToken = jest.fn();

/** Configure getAuth() to return a logged-in user */
function setLoggedIn(token = "mock-id-token") {
  mockGetIdToken.mockResolvedValue(token);
  (getAuth as jest.Mock).mockReturnValue({
    currentUser: { getIdToken: mockGetIdToken },
  });
}

/** Configure getAuth() to return no user (logged out) */
function setLoggedOut() {
  (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
}

/** Configure getIdToken to throw (e.g. expired refresh token) */
function setIdTokenFailure(error = new Error("token refresh failed")) {
  mockGetIdToken.mockRejectedValue(error);
  (getAuth as jest.Mock).mockReturnValue({
    currentUser: { getIdToken: mockGetIdToken },
  });
}

// ─── Global fetch mock ──────────────────────────────────────────────────────

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

/** Create a mock Response that resolves to the given JSON */
function mockOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

/** Create a mock non-OK Response */
function mockErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: jest.fn().mockRejectedValue(new Error("not json")),
    text: jest.fn().mockResolvedValue(body),
  };
}

/**
 * Helper: extract the function name from a fetch URL.
 * E.g. "https://us-central1-foo.cloudfunctions.net/myFunc" → "myFunc"
 */
function getFunctionName(url: string): string {
  return url.split("/").pop()!;
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setLoggedIn();
  mockFetch.mockResolvedValue(mockOkResponse({ success: true }));
});

// ============================================================================
// callFunction core behaviour
// ============================================================================

describe("callFunction (core behaviour)", () => {
  it("sends POST request with correct function name in URL path", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));
    await createConnectAccount();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("createConnectAccount");
    expect(options.method).toBe("POST");
  });

  it("constructs URL with base + function name", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));
    await createConnectAccount();

    const [url] = mockFetch.mock.calls[0];
    // URL should end with /functionName and have a proper https base
    expect(url).toMatch(/^https:\/\/.+\/createConnectAccount$/);
  });

  it("includes Content-Type: application/json header", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));
    await createConnectAccount();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("includes Authorization header when user is logged in", async () => {
    setLoggedIn("my-special-token");
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));
    await createConnectAccount();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-special-token");
  });

  it("omits Authorization header when no user is logged in", async () => {
    setLoggedOut();
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));
    await createConnectAccount();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("handles getIdToken failure gracefully (proceeds without auth)", async () => {
    setIdTokenFailure();
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_123" }));

    // Should not throw — the catch block swallows the error
    const result = await createConnectAccount();
    expect(result).toEqual({ accountId: "acct_123" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("sends JSON-stringified body", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({
        clientSecret: "cs",
        paymentIntentId: "pi",
        customerId: "cus",
      }),
    );
    await createPaymentIntent(2500);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ amount: 2500 });
  });

  it("returns parsed JSON on success", async () => {
    const payload = {
      clientSecret: "cs_123",
      paymentIntentId: "pi_456",
      customerId: "cus_789",
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await createPaymentIntent(1000);
    expect(result).toEqual(payload);
  });

  it("throws on non-OK response with function name, status and body", async () => {
    mockFetch.mockResolvedValue(
      mockErrorResponse(403, "Forbidden: invalid token"),
    );

    await expect(createConnectAccount()).rejects.toThrow(
      "[createConnectAccount] 403: Forbidden: invalid token",
    );
  });

  it("throws on 500 server error", async () => {
    mockFetch.mockResolvedValue(
      mockErrorResponse(500, "Internal Server Error"),
    );

    await expect(createConnectAccount()).rejects.toThrow(
      "[createConnectAccount] 500: Internal Server Error",
    );
  });

  it("propagates network errors from fetch", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(createConnectAccount()).rejects.toThrow(
      "Network request failed",
    );
  });

  it("uses same base URL for all function calls", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    await createConnectAccount();
    await acceptLegalTerms("1.0");
    await cancelGroupSession("s1");

    const urls = mockFetch.mock.calls.map(([url]: [string]) => url);
    const bases = urls.map((u: string) => u.substring(0, u.lastIndexOf("/")));
    // All calls should share the same base URL
    expect(new Set(bases).size).toBe(1);
  });
});

// ============================================================================
// FUNCTIONS_BASE URL construction (env var driven)
// ============================================================================

describe("FUNCTIONS_BASE URL construction", () => {
  it("uses EXPO_PUBLIC_FUNCTIONS_URL when set", async () => {
    const customUrl = "https://my-custom-functions.example.com";
    process.env.EXPO_PUBLIC_FUNCTIONS_URL = customUrl;

    jest.resetModules();

    const { createConnectAccount: freshFn } =
      require("../../../config/functions") as typeof import("../../../config/functions");
    const { getAuth: freshGetAuth } =
      require("@react-native-firebase/auth") as typeof import("@react-native-firebase/auth");
    (freshGetAuth as jest.Mock).mockReturnValue({
      currentUser: { getIdToken: jest.fn().mockResolvedValue("tok") },
    });

    const localFetch = jest
      .fn()
      .mockResolvedValue(mockOkResponse({ accountId: "a" }));
    globalThis.fetch = localFetch;

    await freshFn();

    const [url] = localFetch.mock.calls[0];
    expect(url).toBe(`${customUrl}/createConnectAccount`);

    // Cleanup
    delete process.env.EXPO_PUBLIC_FUNCTIONS_URL;
    globalThis.fetch = mockFetch;
  });

  it("falls back to project-ID template when EXPO_PUBLIC_FUNCTIONS_URL is unset", async () => {
    delete process.env.EXPO_PUBLIC_FUNCTIONS_URL;
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "niyah-b972d";

    jest.resetModules();

    const { createConnectAccount: freshFn } =
      require("../../../config/functions") as typeof import("../../../config/functions");
    const { getAuth: freshGetAuth } =
      require("@react-native-firebase/auth") as typeof import("@react-native-firebase/auth");
    (freshGetAuth as jest.Mock).mockReturnValue({
      currentUser: { getIdToken: jest.fn().mockResolvedValue("tok") },
    });

    const localFetch = jest
      .fn()
      .mockResolvedValue(mockOkResponse({ accountId: "a" }));
    globalThis.fetch = localFetch;

    await freshFn();

    const [url] = localFetch.mock.calls[0];
    expect(url).toBe(
      "https://us-central1-niyah-b972d.cloudfunctions.net/createConnectAccount",
    );

    // Cleanup
    globalThis.fetch = mockFetch;
  });
});

// ============================================================================
// Exported wrapper functions — verify correct function name and body
// ============================================================================

describe("createPaymentIntent", () => {
  it("calls createPaymentIntent with { amount }", async () => {
    const payload = {
      clientSecret: "cs",
      paymentIntentId: "pi",
      customerId: "cus",
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await createPaymentIntent(5000);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("createPaymentIntent");
    expect(JSON.parse(options.body)).toEqual({ amount: 5000 });
    expect(result).toEqual(payload);
  });
});

describe("verifyAndCreditDeposit", () => {
  it("calls verifyAndCreditDeposit with { paymentIntentId }", async () => {
    const payload = { credited: true, newBalance: 10000 };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await verifyAndCreditDeposit("pi_abc123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("verifyAndCreditDeposit");
    expect(JSON.parse(options.body)).toEqual({ paymentIntentId: "pi_abc123" });
    expect(result).toEqual(payload);
  });
});

describe("handleSessionComplete", () => {
  it("calls handleSessionComplete with { sessionId } only (ignores _stakeAmount)", async () => {
    const payload = { newBalance: 5500, payout: 500 };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await handleSessionComplete("sess_1", 1000);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("handleSessionComplete");
    // _stakeAmount should NOT appear in the body
    expect(JSON.parse(options.body)).toEqual({ sessionId: "sess_1" });
    expect(result).toEqual(payload);
  });

  it("works without _stakeAmount parameter", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ newBalance: 5500, payout: 500 }),
    );
    await handleSessionComplete("sess_2");

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ sessionId: "sess_2" });
  });
});

describe("handleSessionForfeit", () => {
  it("calls handleSessionForfeit with { sessionId } only (ignores _stakeAmount)", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    const result = await handleSessionForfeit("sess_3", 500);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("handleSessionForfeit");
    expect(JSON.parse(options.body)).toEqual({ sessionId: "sess_3" });
    expect(result).toEqual({ success: true });
  });
});

describe("createConnectAccount", () => {
  it("calls createConnectAccount with empty body", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ accountId: "acct_456" }));

    const result = await createConnectAccount();

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("createConnectAccount");
    expect(JSON.parse(options.body)).toEqual({});
    expect(result).toEqual({ accountId: "acct_456" });
  });
});

describe("createAccountLink", () => {
  it("calls createAccountLink with empty body", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ url: "https://connect.stripe.com/..." }),
    );

    const result = await createAccountLink();

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("createAccountLink");
    expect(JSON.parse(options.body)).toEqual({});
    expect(result).toEqual({ url: "https://connect.stripe.com/..." });
  });
});

describe("getConnectAccountStatus", () => {
  it("calls getConnectAccountStatus with empty body", async () => {
    const payload = {
      status: "active",
      chargesEnabled: true,
      payoutsEnabled: true,
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await getConnectAccountStatus();

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("getConnectAccountStatus");
    expect(JSON.parse(options.body)).toEqual({});
    expect(result).toEqual(payload);
  });
});

describe("requestWithdrawal", () => {
  it("calls requestWithdrawal with { amount, method }", async () => {
    const payload = {
      success: true,
      transferId: "tr_123",
      payoutId: "po_456",
      estimatedArrival: "2026-03-25",
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await requestWithdrawal(5000, "instant");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("requestWithdrawal");
    expect(JSON.parse(options.body)).toEqual({
      amount: 5000,
      method: "instant",
    });
    expect(result).toEqual(payload);
  });

  it("supports standard withdrawal method", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({
        success: true,
        transferId: "tr_789",
        estimatedArrival: "2026-03-26",
      }),
    );
    await requestWithdrawal(10000, "standard");

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      amount: 10000,
      method: "standard",
    });
  });
});

describe("awardReferral", () => {
  it("calls awardReferral with { referrerUid }", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    const result = await awardReferral("uid_referrer");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("awardReferral");
    expect(JSON.parse(options.body)).toEqual({ referrerUid: "uid_referrer" });
    expect(result).toEqual({ success: true });
  });
});

describe("followUserCF", () => {
  it("calls Cloud Function followUserFn with { targetUid }", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    const result = await followUserCF("uid_target");

    const [url, options] = mockFetch.mock.calls[0];
    // The exported function is followUserCF but the CF name is followUserFn
    expect(getFunctionName(url)).toBe("followUserFn");
    expect(JSON.parse(options.body)).toEqual({ targetUid: "uid_target" });
    expect(result).toEqual({ success: true });
  });
});

describe("unfollowUserCF", () => {
  it("calls Cloud Function unfollowUserFn with { targetUid }", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    const result = await unfollowUserCF("uid_target2");

    const [url, options] = mockFetch.mock.calls[0];
    // The exported function is unfollowUserCF but the CF name is unfollowUserFn
    expect(getFunctionName(url)).toBe("unfollowUserFn");
    expect(JSON.parse(options.body)).toEqual({ targetUid: "uid_target2" });
    expect(result).toEqual({ success: true });
  });
});

describe("acceptLegalTerms", () => {
  it("calls acceptLegalTerms with { version }", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ success: true }));

    const result = await acceptLegalTerms("2.1.0");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("acceptLegalTerms");
    expect(JSON.parse(options.body)).toEqual({ version: "2.1.0" });
    expect(result).toEqual({ success: true });
  });
});

describe("distributeGroupPayouts", () => {
  it("calls distributeGroupPayouts with { sessionId, stakePerParticipant, results }", async () => {
    const results = [
      { userId: "u1", completed: true },
      { userId: "u2", completed: false },
    ];
    const payload = {
      success: true,
      transfers: ["tr_a", "tr_b"],
      payouts: [
        { userId: "u1", amount: 750 },
        { userId: "u2", amount: 0 },
      ],
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await distributeGroupPayouts("gsess_1", 500, results);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("distributeGroupPayouts");
    expect(JSON.parse(options.body)).toEqual({
      sessionId: "gsess_1",
      stakePerParticipant: 500,
      results,
    });
    expect(result).toEqual(payload);
  });
});

describe("createGroupSession", () => {
  it("defaults customStake to false when omitted", async () => {
    const payload = { sessionId: "gsess_new", inviteIds: ["inv_1", "inv_2"] };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await createGroupSession("daily", 500, 1800, [
      "uid_a",
      "uid_b",
    ]);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("createGroupSession");
    expect(JSON.parse(options.body)).toEqual({
      cadence: "daily",
      stakePerParticipant: 500,
      duration: 1800,
      inviteeIds: ["uid_a", "uid_b"],
      customStake: false,
    });
    expect(result).toEqual(payload);
  });

  it("passes customStake: true when provided", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ sessionId: "gsess_2", inviteIds: ["inv_3"] }),
    );

    await createGroupSession("weekly", 1000, 3600, ["uid_c"], true);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      cadence: "weekly",
      stakePerParticipant: 1000,
      duration: 3600,
      inviteeIds: ["uid_c"],
      customStake: true,
    });
  });

  it("passes customStake: false when explicitly set to false", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ sessionId: "gsess_3", inviteIds: [] }),
    );

    await createGroupSession("daily", 200, 900, [], false);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body).customStake).toBe(false);
  });
});

describe("respondToGroupInvite", () => {
  it("calls respondToGroupInvite with { inviteId, accept: true }", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ success: true, sessionStatus: "ready" }),
    );

    const result = await respondToGroupInvite("inv_123", true);

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("respondToGroupInvite");
    expect(JSON.parse(options.body)).toEqual({
      inviteId: "inv_123",
      accept: true,
    });
    expect(result).toEqual({ success: true, sessionStatus: "ready" });
  });

  it("handles decline (accept: false)", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ success: true, sessionStatus: "cancelled" }),
    );

    await respondToGroupInvite("inv_456", false);

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      inviteId: "inv_456",
      accept: false,
    });
  });
});

describe("markOnlineForSession", () => {
  it("calls markOnlineForSession with { sessionId }", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ success: true, allOnline: false }),
    );

    const result = await markOnlineForSession("gsess_5");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("markOnlineForSession");
    expect(JSON.parse(options.body)).toEqual({ sessionId: "gsess_5" });
    expect(result).toEqual({ success: true, allOnline: false });
  });
});

describe("startGroupSessionCF", () => {
  it("calls Cloud Function startGroupSession with { sessionId }", async () => {
    const endsAt = Date.now() + 3600000;
    mockFetch.mockResolvedValue(mockOkResponse({ success: true, endsAt }));

    const result = await startGroupSessionCF("gsess_6");

    const [url, options] = mockFetch.mock.calls[0];
    // The exported function is startGroupSessionCF but the CF name is startGroupSession
    expect(getFunctionName(url)).toBe("startGroupSession");
    expect(JSON.parse(options.body)).toEqual({ sessionId: "gsess_6" });
    expect(result).toEqual({ success: true, endsAt });
  });
});

describe("reportSessionStatus", () => {
  it("calls reportSessionStatus with { sessionId, action: 'complete' }", async () => {
    const payload = {
      success: true,
      sessionComplete: true,
      payouts: { u1: 750, u2: 250 },
    };
    mockFetch.mockResolvedValue(mockOkResponse(payload));

    const result = await reportSessionStatus("gsess_7", "complete");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("reportSessionStatus");
    expect(JSON.parse(options.body)).toEqual({
      sessionId: "gsess_7",
      action: "complete",
    });
    expect(result).toEqual(payload);
  });

  it("calls reportSessionStatus with action: 'surrender'", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ success: true, sessionComplete: false }),
    );

    await reportSessionStatus("gsess_8", "surrender");

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      sessionId: "gsess_8",
      action: "surrender",
    });
  });
});

describe("cancelGroupSession", () => {
  it("calls cancelGroupSession with { sessionId }", async () => {
    mockFetch.mockResolvedValue(
      mockOkResponse({ success: true, refundedCount: 3 }),
    );

    const result = await cancelGroupSession("gsess_9");

    const [url, options] = mockFetch.mock.calls[0];
    expect(getFunctionName(url)).toBe("cancelGroupSession");
    expect(JSON.parse(options.body)).toEqual({ sessionId: "gsess_9" });
    expect(result).toEqual({ success: true, refundedCount: 3 });
  });
});

// ============================================================================
// Error paths across different wrappers
// ============================================================================

describe("error handling across wrappers", () => {
  it("createPaymentIntent throws on 400 error", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(400, "Invalid amount"));

    await expect(createPaymentIntent(-100)).rejects.toThrow(
      "[createPaymentIntent] 400: Invalid amount",
    );
  });

  it("handleSessionComplete throws on 404 error", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(404, "Session not found"));

    await expect(handleSessionComplete("nonexistent")).rejects.toThrow(
      "[handleSessionComplete] 404: Session not found",
    );
  });

  it("distributeGroupPayouts throws on 401 error", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(401, "Unauthorized"));

    await expect(distributeGroupPayouts("sess", 100, [])).rejects.toThrow(
      "[distributeGroupPayouts] 401: Unauthorized",
    );
  });

  it("requestWithdrawal propagates network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(requestWithdrawal(1000, "standard")).rejects.toThrow(
      "Network request failed",
    );
  });

  it("followUserCF error includes Cloud Function name (followUserFn)", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500, "server error"));

    await expect(followUserCF("uid")).rejects.toThrow(
      "[followUserFn] 500: server error",
    );
  });

  it("startGroupSessionCF error includes Cloud Function name (startGroupSession)", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(409, "already started"));

    await expect(startGroupSessionCF("s1")).rejects.toThrow(
      "[startGroupSession] 409: already started",
    );
  });
});
