import { describe, expect, it } from "vitest";

import {
  createLateLibraryComposition,
  LATE_LIBRARY_LOOP_END,
  LATE_LIBRARY_MASTER,
  LATE_LIBRARY_METER,
  LATE_LIBRARY_SWING_SUBDIVISION,
} from "../../src/audio/lateLibrary";

describe("Late Library composition", () => {
  it("keeps the selected global music and master contracts", () => {
    const composition = createLateLibraryComposition();

    expect(composition.bpm).toBe(84);
    expect(composition.swing).toBe(0.21);
    expect(composition.trimDb).toBe(4.5);
    expect(LATE_LIBRARY_METER).toEqual([4, 4]);
    expect(LATE_LIBRARY_LOOP_END).toBe("16m");
    expect(LATE_LIBRARY_SWING_SUBDIVISION).toBe("8n");
    expect(LATE_LIBRARY_MASTER).toEqual({
      volumeValue: 68,
      minimumDb: -16,
      maximumDb: 2,
      limiterThresholdDb: -3,
    });
  });

  it("creates the same deterministic arrangement every time", () => {
    const firstComposition = createLateLibraryComposition();
    const secondComposition = createLateLibraryComposition();

    expect(secondComposition).toEqual(firstComposition);
    expect(secondComposition).not.toBe(firstComposition);
  });

  it("keeps the expected layer event counts", () => {
    const composition = createLateLibraryComposition();

    expect({
      kick: composition.kick.length,
      snare: composition.snare.length,
      hats: composition.hats.length,
      chords: composition.chords.length,
      bass: composition.bass.length,
      melody: composition.melody.length,
    }).toEqual({
      kick: 35,
      snare: 34,
      hats: 119,
      chords: 22,
      bass: 45,
      melody: 24,
    });
  });

  it("keeps every event within the sixteen-bar loop", () => {
    const composition = createLateLibraryComposition();
    const eventTimes = [
      ...composition.kick,
      ...composition.snare,
      ...composition.hats,
      ...composition.chords,
      ...composition.bass,
      ...composition.melody,
    ].map((event) => event.time);

    for (const eventTime of eventTimes) {
      const [bar, beat, sixteenth] = eventTime.split(":").map(Number);

      expect(Number.isInteger(bar)).toBe(true);
      expect(Number.isInteger(beat)).toBe(true);
      expect(Number.isInteger(sixteenth)).toBe(true);
      expect(bar).toBeGreaterThanOrEqual(0);
      expect(bar).toBeLessThan(16);
      expect(beat).toBeGreaterThanOrEqual(0);
      expect(beat).toBeLessThan(4);
      expect(sixteenth).toBeGreaterThanOrEqual(0);
      expect(sixteenth).toBeLessThan(4);
    }
  });

  it("keeps velocities and derived gains finite and valid", () => {
    const composition = createLateLibraryComposition();
    const velocities = [
      ...composition.kick,
      ...composition.snare,
      ...composition.hats,
      ...composition.chords,
      ...composition.bass,
      ...composition.melody,
    ].map((event) => event.velocity);
    const gainDbValues = [
      composition.trimDb,
      composition.hatTrimDb,
      composition.bassTrimDb,
      composition.melodyTrimDb,
      LATE_LIBRARY_MASTER.minimumDb,
      LATE_LIBRARY_MASTER.maximumDb,
      LATE_LIBRARY_MASTER.limiterThresholdDb,
    ];

    for (const velocity of velocities) {
      expect(Number.isFinite(velocity)).toBe(true);
      expect(velocity).toBeGreaterThanOrEqual(0);
      expect(velocity).toBeLessThanOrEqual(1);
    }

    for (const gainDb of gainDbValues) {
      const normalizedGain = 10 ** (gainDb / 20);
      expect(Number.isFinite(normalizedGain)).toBe(true);
      expect(normalizedGain).toBeGreaterThan(0);
    }
  });

  it("preserves the final bass turnaround and sparse loop boundary", () => {
    const composition = createLateLibraryComposition();
    const finalBarBass = composition.bass.filter((event) => event.time.startsWith("15:"));

    expect(finalBarBass).toEqual([
      { time: "15:0:0", note: "F1", duration: "4n", velocity: 0.55 },
      { time: "15:2:2", note: "F1", duration: "8n", velocity: 0.41 },
      { time: "15:3:2", note: "E1", duration: "8n", velocity: 0.32 },
    ]);
    expect(composition.melody.at(-1)).toEqual({
      time: "13:2:2",
      note: "Bb4",
      duration: "4n",
      velocity: 0.49,
    });
    expect(composition.hats.at(-1)).toEqual({
      time: "15:3:3",
      velocity: 0.18,
    });
  });
});
