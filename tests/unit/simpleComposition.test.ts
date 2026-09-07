import { describe, expect, it } from "vitest";

import {
  createSimpleComposition,
  dbToGain,
  getBarSeconds,
  getLoopSeconds,
} from "../../src/audio/simpleComposition";

describe("simple lo-fi composition", () => {
  it("keeps the selected loop contract", () => {
    const composition = createSimpleComposition();

    expect(composition.bpm).toBe(92);
    expect(composition.beatsPerBar).toBe(4);
    expect(composition.barsPerLoop).toBe(4);
    expect(composition.chords).toHaveLength(4);
    expect(composition.bassRoots).toHaveLength(4);
    expect(composition.chords).toHaveLength(composition.barsPerLoop);
    expect(composition.bassRoots).toHaveLength(composition.barsPerLoop);

    for (const chord of composition.chords) {
      expect(chord).toHaveLength(3);
    }
  });

  it("creates a fresh deterministic arrangement every time", () => {
    const first = createSimpleComposition();
    const second = createSimpleComposition();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.chords).not.toBe(first.chords);
    expect(second.bassRoots).not.toBe(first.bassRoots);
  });

  it("keeps every frequency finite and positive", () => {
    const composition = createSimpleComposition();
    const frequencies = [...composition.chords.flat(), ...composition.bassRoots];

    expect(frequencies.length).toBeGreaterThan(0);

    for (const frequency of frequencies) {
      expect(Number.isFinite(frequency)).toBe(true);
      expect(frequency).toBeGreaterThan(0);
    }
  });

  it("keeps the loop duration consistent with the pinned tempo", () => {
    const composition = createSimpleComposition();

    expect(getBarSeconds(composition.bpm, composition.beatsPerBar)).toBeCloseTo(2.6087, 4);
    expect(getLoopSeconds(composition)).toBeCloseTo(10.4348, 4);
  });

  it("converts decibels to a valid gain", () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.5012, 4);
    expect(dbToGain(6)).toBeGreaterThan(1);
  });
});
