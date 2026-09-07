export type SimpleComposition = {
  bpm: number;
  chords: number[][];
  bassRoots: number[];
  barsPerLoop: number;
  beatsPerBar: number;
};

export const SIMPLE_LOFI_BPM = 92;
export const SIMPLE_LOFI_BEATS_PER_BAR = 4;
export const SIMPLE_LOFI_BARS_PER_LOOP = 4;

const SIMPLE_LOFI_CHORDS: number[][] = [
  [116.54, 174.61, 220.0],
  [98.0, 146.83, 174.61],
  [130.81, 196.0, 233.08],
  [87.31, 174.61, 209.3],
];

const SIMPLE_LOFI_BASS_ROOTS: number[] = [58.27, 49.0, 65.41, 43.65];

export function createSimpleComposition(): SimpleComposition {
  return {
    bpm: SIMPLE_LOFI_BPM,
    chords: SIMPLE_LOFI_CHORDS.map((chord) => [...chord]),
    bassRoots: [...SIMPLE_LOFI_BASS_ROOTS],
    barsPerLoop: SIMPLE_LOFI_BARS_PER_LOOP,
    beatsPerBar: SIMPLE_LOFI_BEATS_PER_BAR,
  };
}

export function getBeatSeconds(bpm: number): number {
  return 60 / bpm;
}

export function getBarSeconds(bpm: number, beatsPerBar: number): number {
  return getBeatSeconds(bpm) * beatsPerBar;
}

export function getLoopSeconds(composition: SimpleComposition): number {
  return getBarSeconds(composition.bpm, composition.beatsPerBar) * composition.barsPerLoop;
}

export function dbToGain(decibels: number): number {
  return 10 ** (decibels / 20);
}
