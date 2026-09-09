import { beforeEach, vi } from "vitest";

/** Handlers log JSON on every invocation; keep it out of the test report. */
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
