import { logger } from "../../../utils/logger";

/* eslint-disable no-console */

describe("logger", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logger.error calls console.error in __DEV__ mode", () => {
    logger.error("test error", 42);
    expect(console.error).toHaveBeenCalledWith("test error", 42);
  });

  it("logger.warn calls console.warn in __DEV__ mode", () => {
    logger.warn("test warning");
    expect(console.warn).toHaveBeenCalledWith("test warning");
  });

  it("logger.info calls console.info in __DEV__ mode", () => {
    logger.info("test info", { key: "value" });
    expect(console.info).toHaveBeenCalledWith("test info", { key: "value" });
  });

  it("logger.debug calls console.log in __DEV__ mode", () => {
    logger.debug("debug message", [1, 2, 3]);
    expect(console.log).toHaveBeenCalledWith("debug message", [1, 2, 3]);
  });

  it("logger.debug with no arguments", () => {
    logger.debug();
    expect(console.log).toHaveBeenCalledWith();
  });
});
