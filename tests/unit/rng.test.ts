import { describe, expect, it } from "vitest";

import { createSeededRng } from "../../src/game/rng";

describe("seeded rng", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createSeededRng(42);
    const second = createSeededRng(42);

    const firstValues = Array.from({ length: 5 }, () => first());
    const secondValues = Array.from({ length: 5 }, () => second());

    expect(firstValues).toEqual(secondValues);
  });

  it("produces different sequences for different seeds", () => {
    const first = createSeededRng(1);
    const second = createSeededRng(2);

    expect(first()).not.toBe(second());
  });

  it("stays within the [0, 1) range across many draws", () => {
    const random = createSeededRng(7);

    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
