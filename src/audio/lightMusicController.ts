import {
  createSimpleComposition,
  dbToGain,
  getBarSeconds,
  type SimpleComposition,
} from "./simpleComposition";

export type LightMusicController = {
  startFromUserGesture: () => Promise<void>;
  setRunningLevel: () => void;
  setGameOverLevel: () => void;
  setRadioEnabled: (enabled: boolean) => void;
  setPageVisible: (visible: boolean) => Promise<void>;
  dispose: () => void;
};

type PlaybackLevel = "idle" | "running" | "gameOver";

export type LightMusicDeps = {
  createAudioContext?: () => AudioContext;
  startScheduler?: (callback: () => void, intervalMs: number) => ReturnType<typeof setInterval>;
  stopScheduler?: (timerId: ReturnType<typeof setInterval>) => void;
};

const SCHEDULER_INTERVAL_MS = 100;
const LOOKAHEAD_SECONDS = 0.2;
const START_DELAY_SECONDS = 0.05;
const RAMP_TIME_CONSTANT = 0.05;
const GAME_OVER_DUCK_DB = -6;
const MASTER_GAIN_VALUE = 0.9;
const PAD_NOTE_GAIN = 0.06;
const BASS_NOTE_GAIN = 0.14;
const HAT_GAIN = 0.04;
const HAT_HIGH_PASS_HZ = 6000;

export function getLightMusicTargetGain(
  playbackLevel: PlaybackLevel,
  radioEnabled: boolean,
  pageVisible: boolean,
  started: boolean,
  disposed: boolean,
): number {
  if (disposed || !started || !radioEnabled || !pageVisible || playbackLevel === "idle") {
    return 0;
  }

  if (playbackLevel === "gameOver") {
    return dbToGain(GAME_OVER_DUCK_DB);
  }

  return 1;
}

function readInitialPageVisible(): boolean {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }

  return true;
}

export function createLightMusicController(deps: LightMusicDeps = {}): LightMusicController {
  const composition: SimpleComposition = createSimpleComposition();
  const barSeconds = getBarSeconds(composition.bpm, composition.beatsPerBar);

  let playbackLevel: PlaybackLevel = "idle";
  let radioEnabled = true;
  let pageVisible = readInitialPageVisible();
  let disposed = false;
  let started = false;

  let audioContext: AudioContext | null = null;
  let stateGain: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let schedulerId: ReturnType<typeof setInterval> | null = null;
  let nextBarTime = 0;
  let barIndex = 0;

  function isStartupEligible(): boolean {
    return playbackLevel !== "idle" && radioEnabled && pageVisible && !disposed;
  }

  function applyAudibleState(): void {
    if (audioContext === null || stateGain === null) {
      return;
    }

    const target = getLightMusicTargetGain(
      playbackLevel,
      radioEnabled,
      pageVisible,
      started,
      disposed,
    );
    stateGain.gain.setTargetAtTime(target, audioContext.currentTime, RAMP_TIME_CONSTANT);
  }

  function ensureGraph(context: AudioContext): void {
    const masterGain = context.createGain();
    masterGain.gain.value = MASTER_GAIN_VALUE;
    masterGain.connect(context.destination);

    stateGain = context.createGain();
    stateGain.gain.value = 0;
    stateGain.connect(masterGain);

    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }
  }

  function schedulePadNote(frequency: number, startTime: number, duration: number): void {
    if (audioContext === null || stateGain === null) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    const noteGain = audioContext.createGain();
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(PAD_NOTE_GAIN, startTime + 0.08);
    noteGain.gain.setValueAtTime(PAD_NOTE_GAIN, startTime + Math.max(0.08, duration - 0.2));
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(noteGain);
    noteGain.connect(stateGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function scheduleBassNote(frequency: number, startTime: number, duration: number): void {
    if (audioContext === null || stateGain === null) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const noteGain = audioContext.createGain();
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(BASS_NOTE_GAIN, startTime + 0.03);
    noteGain.gain.setValueAtTime(BASS_NOTE_GAIN, startTime + Math.max(0.03, duration - 0.1));
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(noteGain);
    noteGain.connect(stateGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function scheduleHat(startTime: number): void {
    if (audioContext === null || stateGain === null || noiseBuffer === null) {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = HAT_HIGH_PASS_HZ;

    const hatGain = audioContext.createGain();
    hatGain.gain.setValueAtTime(HAT_GAIN, startTime);
    hatGain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.04);

    source.connect(filter);
    filter.connect(hatGain);
    hatGain.connect(stateGain);
    source.start(startTime);
    source.stop(startTime + 0.06);
  }

  function scheduleBar(index: number, startTime: number): void {
    const chord = composition.chords[index];
    const bassRoot = composition.bassRoots[index];

    if (chord === undefined || bassRoot === undefined) {
      return;
    }

    for (const frequency of chord) {
      schedulePadNote(frequency, startTime, barSeconds);
    }

    scheduleBassNote(bassRoot, startTime, barSeconds / 2);
    scheduleBassNote(bassRoot, startTime + barSeconds / 2, barSeconds / 2);

    const eighthSeconds = barSeconds / 8;
    for (let eighth = 0; eighth < 8; eighth += 1) {
      scheduleHat(startTime + eighth * eighthSeconds);
    }
  }

  function scheduleBars(): void {
    if (audioContext === null || !started || disposed) {
      return;
    }

    if (nextBarTime < audioContext.currentTime - barSeconds) {
      nextBarTime = audioContext.currentTime + START_DELAY_SECONDS;
    }

    while (nextBarTime < audioContext.currentTime + LOOKAHEAD_SECONDS) {
      scheduleBar(barIndex, nextBarTime);
      nextBarTime += barSeconds;
      barIndex = (barIndex + 1) % composition.barsPerLoop;
    }
  }

  function setRunningLevel(): void {
    playbackLevel = "running";
    applyAudibleState();
  }

  function setGameOverLevel(): void {
    playbackLevel = "gameOver";
    applyAudibleState();
  }

  function setRadioEnabled(enabled: boolean): void {
    radioEnabled = enabled;
    applyAudibleState();
  }

  async function startFromUserGesture(): Promise<void> {
    if (!isStartupEligible() || disposed) {
      return;
    }

    if (audioContext === null) {
      const createContext = deps.createAudioContext ?? ((): AudioContext => new AudioContext());
      const freshContext = createContext();
      audioContext = freshContext;

      try {
        ensureGraph(freshContext);
        nextBarTime = freshContext.currentTime + START_DELAY_SECONDS;
        barIndex = 0;

        const starter = deps.startScheduler ?? ((callback, ms): ReturnType<typeof setInterval> =>
          setInterval(callback, ms));
        schedulerId = starter(scheduleBars, SCHEDULER_INTERVAL_MS);
        started = true;
      } catch (error) {
        if (schedulerId !== null) {
          const stopper = deps.stopScheduler ?? clearInterval;
          stopper(schedulerId);
          schedulerId = null;
        }

        stateGain = null;
        noiseBuffer = null;
        audioContext = null;
        started = false;
        void freshContext.close().catch(() => undefined);
        throw error;
      }
    }

    await audioContext.resume();

    if (disposed) {
      return;
    }

    scheduleBars();
    applyAudibleState();
  }

  async function setPageVisible(visible: boolean): Promise<void> {
    pageVisible = visible;

    if (disposed || audioContext === null) {
      return;
    }

    if (!visible) {
      applyAudibleState();
      await audioContext.suspend();
      return;
    }

    if (!started || !isStartupEligible()) {
      return;
    }

    await audioContext.resume();

    if (disposed || !pageVisible) {
      return;
    }

    applyAudibleState();
  }

  function dispose(): void {
    if (disposed) {
      return;
    }

    disposed = true;

    if (schedulerId !== null) {
      const stopper = deps.stopScheduler ?? clearInterval;
      stopper(schedulerId);
      schedulerId = null;
    }

    if (audioContext !== null) {
      void audioContext.close().catch(() => undefined);
      audioContext = null;
      stateGain = null;
      noiseBuffer = null;
    }
  }

  return {
    startFromUserGesture,
    setRunningLevel,
    setGameOverLevel,
    setRadioEnabled,
    setPageVisible,
    dispose,
  };
}
