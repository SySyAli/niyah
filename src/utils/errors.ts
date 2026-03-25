interface ErrorWithCode extends Error {
  code?: string;
}

const CANCELLATION_CODES = new Set([
  "SIGN_IN_CANCELLED",
  "SIGN_IN_CANCELED",
  "ERR_REQUEST_CANCELED",
  "ERR_REQUEST_CANCELLED",
  "Canceled",
  "Cancelled",
  "CanceledError",
]);

export const createErrorWithCode = (
  message: string,
  code: string,
): ErrorWithCode => {
  const error = new Error(message) as ErrorWithCode;
  error.code = code;
  return error;
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
};

export const getErrorMessage = (
  error: unknown,
  fallback: string = "Something went wrong. Please try again.",
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};

export const isUserCancellationError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code && CANCELLATION_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error, "").toLowerCase();
  return message.includes("cancelled") || message.includes("canceled");
};

export const getFunctionErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const message = getErrorMessage(error, fallback);
  const normalized = message.replace(/^\[[^\]]+\]\s*\d{3}:\s*/, "").trim();

  return normalized || fallback;
};
