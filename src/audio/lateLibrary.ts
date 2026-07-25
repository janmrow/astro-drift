export type TimedNote = {
  time: string;
  note: string;
  duration: string;
  velocity: number;
};

export type TimedChord = {
  time: string;
  notes: string[];
  duration: string;
  velocity: number;
};

export type TimedDrumHit = {
  time: string;
  velocity: number;
};

export type LateLibraryComposition = {
  bpm: number;
  swing: number;
  trimDb: number;
  warmth: {
    lowDb: number;
    midDb: number;
    highDb: number;
  };
  chordOscillator: "sine";
  bassOscillator: "sine";
  melodyOscillator: "sine";
  chordFilterFrequency: number;
  chordAttack: number;
  chordRelease: number;
  chorusWet: number;
  reverbWet: number;
  reverbDecay: number;
  delayWet: number;
  hatTrimDb: number;
  bassTrimDb: number;
  melodyTrimDb: number;
  melodyHarmonicity: number;
  melodyModulationIndex: number;
  kick: TimedDrumHit[];
  snare: TimedDrumHit[];
  hats: TimedDrumHit[];
  chords: TimedChord[];
  bass: TimedNote[];
  melody: TimedNote[];
};

export const LATE_LIBRARY_LOOP_END = "16m";
export const LATE_LIBRARY_SWING_SUBDIVISION = "8n";
export const LATE_LIBRARY_METER = [4, 4] as const;

export const LATE_LIBRARY_MASTER = {
  volumeValue: 68,
  minimumDb: -16,
  maximumDb: 2,
  limiterThresholdDb: -3,
} as const;

const time = (bar: number, beat = 0, sixteenth = 0): string =>
  `${bar}:${beat}:${sixteenth}`;

export function createLateLibraryComposition(): LateLibraryComposition {
  const kick: TimedDrumHit[] = [];
  const snare: TimedDrumHit[] = [];
  const hats: TimedDrumHit[] = [];

  for (let bar = 0; bar < 16; bar += 1) {
    kick.push({ time: time(bar), velocity: 0.63 });
    kick.push({
      time: time(bar, [2, 6, 10, 14].includes(bar) ? 1 : 2, 2),
      velocity: 0.45,
    });

    if ([3, 9, 15].includes(bar)) {
      kick.push({ time: time(bar, 3, 2), velocity: 0.36 });
    }

    snare.push({ time: time(bar, 1), velocity: 0.48 });
    snare.push({ time: time(bar, 3), velocity: 0.51 });

    if ([6, 14].includes(bar)) {
      snare.push({ time: time(bar, 2, 3), velocity: 0.2 });
    }

    for (let eighth = 0; eighth < 8; eighth += 1) {
      if ((bar + eighth) % 11 === 0 || (bar === 15 && eighth === 6)) {
        continue;
      }

      hats.push({
        time: time(bar, Math.floor(eighth / 2), (eighth % 2) * 2),
        velocity: eighth % 2 === 0 ? 0.29 : 0.22,
      });
    }
  }

  hats.push({ time: time(7, 3, 3), velocity: 0.17 });
  hats.push({ time: time(15, 3, 3), velocity: 0.18 });

  const chords: TimedChord[] = [
    {
      time: time(0),
      notes: ["Bb2", "F3", "A3", "C4", "D4"],
      duration: "2n",
      velocity: 0.45,
    },
    {
      time: time(0, 3),
      notes: ["Bb2", "D3", "A3", "C4"],
      duration: "4n",
      velocity: 0.31,
    },
    {
      time: time(1),
      notes: ["G2", "D3", "F3", "A3", "Bb3"],
      duration: "2n.",
      velocity: 0.42,
    },
    {
      time: time(2),
      notes: ["C3", "G3", "Bb3", "D4", "Eb4"],
      duration: "2n",
      velocity: 0.44,
    },
    {
      time: time(2, 3),
      notes: ["C3", "Eb3", "Bb3", "D4"],
      duration: "4n",
      velocity: 0.3,
    },
    {
      time: time(3),
      notes: ["F2", "C3", "Eb3", "A3", "D4"],
      duration: "2n.",
      velocity: 0.41,
    },
    {
      time: time(4),
      notes: ["Bb2", "D3", "A3", "C4", "F4"],
      duration: "2n.",
      velocity: 0.44,
    },
    {
      time: time(5),
      notes: ["G2", "D3", "F3", "A3", "C4"],
      duration: "2n",
      velocity: 0.41,
    },
    {
      time: time(5, 3),
      notes: ["G2", "F3", "A3", "Bb3"],
      duration: "4n",
      velocity: 0.28,
    },
    {
      time: time(6),
      notes: ["C3", "G3", "Bb3", "D4", "F4"],
      duration: "2n.",
      velocity: 0.43,
    },
    {
      time: time(7),
      notes: ["F2", "C3", "Eb3", "A3", "D4"],
      duration: "2n.",
      velocity: 0.39,
    },
    {
      time: time(8),
      notes: ["Eb3", "Bb3", "D4", "F4", "G4"],
      duration: "2n",
      velocity: 0.45,
    },
    {
      time: time(8, 3),
      notes: ["Eb3", "G3", "D4", "F4"],
      duration: "4n",
      velocity: 0.3,
    },
    {
      time: time(9),
      notes: ["D3", "A3", "C4", "F4"],
      duration: "2n.",
      velocity: 0.41,
    },
    {
      time: time(10),
      notes: ["C3", "G3", "Bb3", "D4", "Eb4"],
      duration: "2n",
      velocity: 0.43,
    },
    {
      time: time(10, 3),
      notes: ["C3", "Eb3", "Bb3", "D4"],
      duration: "4n",
      velocity: 0.29,
    },
    {
      time: time(11),
      notes: ["F2", "C3", "Eb3", "A3", "D4"],
      duration: "2n.",
      velocity: 0.4,
    },
    {
      time: time(12),
      notes: ["Bb2", "F3", "A3", "C4", "D4"],
      duration: "2n.",
      velocity: 0.44,
    },
    {
      time: time(13),
      notes: ["G2", "D3", "F3", "A3", "Bb3"],
      duration: "2n.",
      velocity: 0.41,
    },
    {
      time: time(14),
      notes: ["C3", "G3", "Bb3", "D4", "F4"],
      duration: "2n",
      velocity: 0.42,
    },
    {
      time: time(14, 3),
      notes: ["C3", "Eb3", "Bb3", "D4"],
      duration: "4n",
      velocity: 0.28,
    },
    {
      time: time(15),
      notes: ["F2", "C3", "Eb3", "A3", "D4"],
      duration: "2n.",
      velocity: 0.38,
    },
  ];

  const roots = [
    "Bb1",
    "G1",
    "C2",
    "F1",
    "Bb1",
    "G1",
    "C2",
    "F1",
    "Eb2",
    "D2",
    "C2",
    "F1",
    "Bb1",
    "G1",
    "C2",
    "F1",
  ];
  const bass = roots.flatMap<TimedNote>((note, bar) => {
    const notes: TimedNote[] = [
      { time: time(bar), note, duration: "4n", velocity: 0.55 },
      { time: time(bar, 2, 2), note, duration: "8n", velocity: 0.41 },
    ];

    if (![3, 7, 11].includes(bar)) {
      const approach = ["A1", "F#1", "B1", "E1"][bar % 4] ?? note;
      notes.push({
        time: time(bar, 3, 2),
        note: approach,
        duration: "8n",
        velocity: 0.32,
      });
    }

    return notes;
  });

  const melody: TimedNote[] = [
    { time: time(0, 1), note: "D5", duration: "8n", velocity: 0.52 },
    { time: time(0, 1, 2), note: "F5", duration: "8n", velocity: 0.49 },
    { time: time(0, 2), note: "D5", duration: "8n", velocity: 0.47 },
    { time: time(0, 2, 2), note: "C5", duration: "4n", velocity: 0.51 },
    { time: time(1, 2), note: "A4", duration: "8n", velocity: 0.45 },
    { time: time(1, 2, 2), note: "Bb4", duration: "4n", velocity: 0.49 },
    { time: time(4, 1), note: "D5", duration: "8n", velocity: 0.51 },
    { time: time(4, 1, 2), note: "F5", duration: "8n", velocity: 0.48 },
    { time: time(4, 2), note: "G5", duration: "8n", velocity: 0.49 },
    { time: time(4, 2, 2), note: "F5", duration: "4n", velocity: 0.52 },
    { time: time(5, 2), note: "D5", duration: "8n", velocity: 0.45 },
    { time: time(5, 2, 2), note: "Bb4", duration: "4n", velocity: 0.49 },
    { time: time(8, 1), note: "G4", duration: "8n", velocity: 0.48 },
    { time: time(8, 1, 2), note: "Bb4", duration: "8n", velocity: 0.47 },
    { time: time(8, 2), note: "D5", duration: "8n", velocity: 0.49 },
    { time: time(8, 2, 2), note: "F5", duration: "4n", velocity: 0.52 },
    { time: time(9, 2), note: "Eb5", duration: "8n", velocity: 0.46 },
    { time: time(9, 2, 2), note: "D5", duration: "4n", velocity: 0.5 },
    { time: time(12, 1), note: "D5", duration: "8n", velocity: 0.52 },
    { time: time(12, 1, 2), note: "F5", duration: "8n", velocity: 0.49 },
    { time: time(12, 2), note: "D5", duration: "8n", velocity: 0.47 },
    { time: time(12, 2, 2), note: "C5", duration: "4n", velocity: 0.51 },
    { time: time(13, 2), note: "A4", duration: "8n", velocity: 0.45 },
    { time: time(13, 2, 2), note: "Bb4", duration: "4n", velocity: 0.49 },
  ];

  return {
    bpm: 84,
    swing: 0.21,
    trimDb: 4.5,
    warmth: {
      lowDb: 1.8,
      midDb: 0.8,
      highDb: -2,
    },
    chordOscillator: "sine",
    bassOscillator: "sine",
    melodyOscillator: "sine",
    chordFilterFrequency: 2250,
    chordAttack: 0.035,
    chordRelease: 0.6,
    chorusWet: 0.03,
    reverbWet: 0.12,
    reverbDecay: 1.5,
    delayWet: 0.035,
    hatTrimDb: -2.5,
    bassTrimDb: 1.2,
    melodyTrimDb: -2,
    melodyHarmonicity: 1,
    melodyModulationIndex: 0.45,
    kick,
    snare,
    hats,
    chords,
    bass,
    melody,
  };
}
