import { describe, expect, it } from "vitest";

import { formatScore, formatTime } from "../../src/game/format";

describe("formatting", () => {
  it("formats score as a five digit value", () => {
    expect(formatScore(7.9)).toBe("00007");
    expect(formatScore(123)).toBe("00123");
  });

  it("formats survival time in seconds", () => {
    expect(formatTime(12.9)).toBe("12s");
  });
});
