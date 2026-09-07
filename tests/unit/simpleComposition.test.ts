import { describe, expect, it } from "vitest";

import {
  createSimpleComposition,
  getBarSeconds,
  getLoopSeconds,
  SIMPLE_LOFI_BARS_PER_LOOP,
  SIMPLE_LOFI_BEATS_PER_BAR,
  SIMPLE_LOFI_BPM,
} from "../../src/audio/simpleComposition";

describe("simple lo-fi composition", () => {
  it("keeps the selected loop contract", () => {
    const composition = createSimpleComposition();

    expect(composition.bpm).toBe(SIMPLE_LOFI_BPM);
    expect(composition.beatsPerBar).toBe(SIMPLE_LOFI_BEATS_PER_BAR);
    expect(composition.barsPerLoop).toBe(SIMPLE_LOFI_BARS_PER_LOOP);
    expect(composition.chords).toHaveLength(4);
    expect(composition.bassRoots).toHaveLength(4);
  });

  it("creates a fresh deterministic arrangement every time", () => {
    const first = createSimpleComposition();
    const second = createSimpleComposition();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.chords).not.toBe(first.chords);
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

  it("keeps the loop duration consistent with tempo", () => {
    const composition = createSimpleComposition();

    expect(getBarSeconds(composition.bpm, composition.beatsPerBar)).toBeCloseTo(
      (60 / SIMPLE_LOFI_BPM) * SIMPLE_LOFI_BEATS_PER_BAR,
      10,
    );
    expect(getLoopSeconds(composition)).toBeCloseTo(
      getBarSeconds(composition.bpm, composition.beatsPerBar) * composition.barsPerLoop,
      10,
    );
  });
});
