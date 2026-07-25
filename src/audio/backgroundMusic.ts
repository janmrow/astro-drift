import type * as Tone from "tone";

import {
  createLateLibraryComposition,
  LATE_LIBRARY_LOOP_END,
  LATE_LIBRARY_MASTER,
  LATE_LIBRARY_SWING_SUBDIVISION,
  type LateLibraryComposition,
  type TimedChord,
  type TimedDrumHit,
  type TimedNote,
} from "./lateLibrary";

type Disposable = {
  dispose: () => unknown;
};

type ActiveTrack = {
  output: Tone.Gain;
  disposables: Disposable[];
};

type PlaybackLevel = "idle" | "running" | "gameOver";
type ToneModule = typeof Tone;
type ToneLoader = () => Promise<ToneModule>;

export type BackgroundMusicController = {
  startFromUserGesture: () => Promise<void>;
  setRunningLevel: () => void;
  setGameOverLevel: () => void;
  setRadioEnabled: (enabled: boolean) => void;
  setPageVisible: (visible: boolean) => Promise<void>;
  dispose: () => void;
};

const TRACK_FADE_SECONDS = 0.08;
const MASTER_RAMP_SECONDS = 0.04;
const PLAYBACK_LEVEL_RAMP_SECONDS = 0.2;
const SILENCE_RAMP_SECONDS = 0.08;
const GAME_OVER_DUCK_DB = -6;
const TRANSPORT_START_DELAY = "+0.05";

function configureLoop<EventType>(part: Tone.Part<EventType>): Tone.Part<EventType> {
  part.loop = true;
  part.loopEnd = LATE_LIBRARY_LOOP_END;
  part.start(0);
  return part;
}

export function createBackgroundMusicController(
  loadTone: ToneLoader = () => import("tone"),
): BackgroundMusicController {
  let activeTrack: ActiveTrack | null = null;
  let masterGain: Tone.Gain | null = null;
  let stateGain: Tone.Gain | null = null;
  let limiter: Tone.Limiter | null = null;
  let initializationPromise: Promise<void> | null = null;
  let toneModulePromise: Promise<ToneModule> | null = null;
  let contextStartPromise: Promise<void> | null = null;
  let toneModule: ToneModule | null = null;
  let audioSessionStarted = false;
  let audioContextActive = false;
  let playbackLevel: PlaybackLevel = "idle";
  let radioEnabled = true;
  let pageVisible = document.visibilityState !== "hidden";
  let disposed = false;
  let visibilityRevision = 0;
  let startupAttemptId = 0;
  let latestStartupRequestId = 0;
  let nextStartupIntentId = 0;
  let pendingStartupIntentId: number | null = null;

  function setRunningLevel(): void {
    playbackLevel = "running";
    applyAudibleState(PLAYBACK_LEVEL_RAMP_SECONDS);
  }

  function setGameOverLevel(): void {
    playbackLevel = "gameOver";
    applyAudibleState(PLAYBACK_LEVEL_RAMP_SECONDS);
  }

  function setRadioEnabled(enabled: boolean): void {
    if (radioEnabled && !enabled) {
      pendingStartupIntentId = null;
      invalidateStartup();
    }

    radioEnabled = enabled;
    applyAudibleState(SILENCE_RAMP_SECONDS);
  }

  async function startFromUserGesture(): Promise<void> {
    if (!isStartupEligible()) {
      return;
    }

    const intentId = ++nextStartupIntentId;
    pendingStartupIntentId = intentId;
    await runPendingStartup(intentId);
  }

  async function runPendingStartup(intentId: number): Promise<void> {
    try {
      await continueStartup(intentId);
    } catch (error) {
      clearPendingStartupIntent(intentId);
      throw error;
    }
  }

  async function continueStartup(intentId: number): Promise<void> {
    if (
      pendingStartupIntentId !== intentId ||
      !isStartupEligible()
    ) {
      return;
    }

    const attemptId = ++startupAttemptId;
    latestStartupRequestId = attemptId;
    const tone = await loadToneForAuthorizedStartup();

    if (!isCurrentStartup(attemptId)) {
      return;
    }

    const hadActiveSession = audioSessionStarted && activeTrack !== null;
    await startAudioContext(tone);

    if (!isCurrentStartup(attemptId)) {
      await suspendAbandonedStartup(tone, hadActiveSession);
      return;
    }

    if (activeTrack !== null) {
      clearPendingStartupIntent(intentId);
      applyAudibleState(SILENCE_RAMP_SECONDS);
      return;
    }

    if (initializationPromise !== null) {
      await initializationPromise;

      if (!isCurrentStartup(attemptId)) {
        await suspendAbandonedStartup(tone, hadActiveSession);
        return;
      }

      if (activeTrack !== null) {
        clearPendingStartupIntent(intentId);
        applyAudibleState(SILENCE_RAMP_SECONDS);
        return;
      }
    }

    const pendingInitialization = initializeTrack(tone, attemptId);
    initializationPromise = pendingInitialization;

    try {
      try {
        await pendingInitialization;
      } catch (error) {
        try {
          await tearDownFailedInitialization(tone);
        } catch {
          // Preserve the initialization failure reported to the application.
        }

        throw error;
      }

      if (isCurrentStartup(attemptId)) {
        if (activeTrack !== null) {
          clearPendingStartupIntent(intentId);
        }
        applyAudibleState(SILENCE_RAMP_SECONDS);
      } else {
        await suspendAbandonedStartup(tone, hadActiveSession);
      }
    } finally {
      if (initializationPromise === pendingInitialization) {
        initializationPromise = null;
      }
    }
  }

  function loadToneForAuthorizedStartup(): Promise<ToneModule> {
    if (toneModulePromise === null) {
      const pendingModule = loadTone();
      toneModulePromise = pendingModule;

      void pendingModule.catch(() => {
        if (toneModulePromise === pendingModule) {
          toneModulePromise = null;
        }
      });
    }

    return toneModulePromise.then((loadedTone) => {
      toneModule = loadedTone;
      return loadedTone;
    });
  }

  function startAudioContext(tone: ToneModule): Promise<void> {
    if (audioContextActive) {
      return Promise.resolve();
    }

    if (contextStartPromise === null) {
      const pendingStart = tone
        .start()
        .then(async () => {
          if (disposed) {
            await suspendAudioContext(tone);
            return;
          }

          audioSessionStarted = true;
          audioContextActive = true;
        })
        .catch((error: unknown) => {
          audioContextActive = false;
          applyAudibleState(SILENCE_RAMP_SECONDS);
          throw error;
        });

      contextStartPromise = pendingStart;

      const clearPendingStart = (): void => {
        if (contextStartPromise === pendingStart) {
          contextStartPromise = null;
        }
      };

      void pendingStart.then(clearPendingStart, clearPendingStart);
    }

    return contextStartPromise;
  }

  async function initializeTrack(tone: ToneModule, attemptId: number): Promise<void> {
    if (!isCurrentStartup(attemptId) || activeTrack !== null) {
      return;
    }

    const createdMasterChain = masterGain === null;
    ensureMasterChain(tone);

    const transport = tone.getTransport();
    transport.stop();
    transport.cancel(0);
    transport.position = "0:0:0";

    const composition = createLateLibraryComposition();
    transport.bpm.value = composition.bpm;
    transport.swing = composition.swing;
    transport.swingSubdivision = LATE_LIBRARY_SWING_SUBDIVISION;

    if (masterGain === null) {
      throw new Error("Master audio chain is not initialized.");
    }

    const createdTrack = await createActiveTrack(
      tone,
      composition,
      masterGain,
      () => isCurrentStartup(attemptId),
    );

    if (createdTrack === null) {
      if (createdMasterChain && activeTrack === null) {
        disposeMasterChain();
      }
      return;
    }

    if (!isCurrentStartup(attemptId) || activeTrack !== null) {
      disposeActiveTrack(createdTrack);

      if (createdMasterChain && activeTrack === null) {
        disposeMasterChain();
      }
      return;
    }

    activeTrack = createdTrack;

    const now = tone.now();
    createdTrack.output.gain.setValueAtTime(0, now);
    createdTrack.output.gain.linearRampToValueAtTime(
      tone.dbToGain(composition.trimDb),
      now + TRACK_FADE_SECONDS,
    );

    try {
      if (!isCurrentStartup(attemptId)) {
        activeTrack = null;
        disposeActiveTrack(createdTrack);

        if (createdMasterChain) {
          disposeMasterChain();
        }
        return;
      }

      setInitialAudibleState();
      transport.start(TRANSPORT_START_DELAY, "0:0:0");
    } catch (error) {
      activeTrack = null;
      disposeActiveTrack(createdTrack);
      transport.stop();
      transport.cancel(0);
      transport.position = "0:0:0";
      throw error;
    }
  }

  function ensureMasterChain(tone: ToneModule): void {
    if (masterGain !== null) {
      return;
    }

    limiter = new tone.Limiter(LATE_LIBRARY_MASTER.limiterThresholdDb).toDestination();
    stateGain = new tone.Gain(0).connect(limiter);
    masterGain = new tone.Gain(0).connect(stateGain);

    const now = tone.now();
    masterGain.gain.linearRampToValueAtTime(
      getReferenceMasterGain(tone),
      now + MASTER_RAMP_SECONDS,
    );
  }

  function setInitialAudibleState(): void {
    if (stateGain === null) {
      return;
    }

    const now = toneModule?.now();

    if (now === undefined) {
      return;
    }

    const targetGain = getTargetStateGain();
    stateGain.gain.cancelScheduledValues(now);
    stateGain.gain.setValueAtTime(targetGain, now);
  }

  function applyAudibleState(rampSeconds: number): void {
    rampStateGain(getTargetStateGain(), rampSeconds);
  }

  function getTargetStateGain(): number {
    if (!shouldBeAudible()) {
      return 0;
    }

    return playbackLevel === "gameOver"
      ? (toneModule?.dbToGain(GAME_OVER_DUCK_DB) ?? 0)
      : 1;
  }

  function shouldBeAudible(): boolean {
    return (
      activeTrack !== null &&
      audioSessionStarted &&
      audioContextActive &&
      playbackLevel !== "idle" &&
      radioEnabled &&
      pageVisible &&
      !disposed
    );
  }

  function isStartupEligible(): boolean {
    return playbackLevel !== "idle" && radioEnabled && pageVisible && !disposed;
  }

  function isCurrentStartup(attemptId: number): boolean {
    return attemptId === startupAttemptId && isStartupEligible();
  }

  function invalidateStartup(): void {
    startupAttemptId += 1;
  }

  function clearPendingStartupIntent(intentId: number): void {
    if (pendingStartupIntentId === intentId) {
      pendingStartupIntentId = null;
    }
  }

  async function suspendAbandonedStartup(
    tone: ToneModule,
    hadActiveSession: boolean,
  ): Promise<void> {
    const newerEligibleStartupExists =
      latestStartupRequestId === startupAttemptId && isStartupEligible();

    if (hadActiveSession || newerEligibleStartupExists) {
      return;
    }

    audioSessionStarted = false;
    audioContextActive = false;
    applyAudibleState(SILENCE_RAMP_SECONDS);
    await suspendAudioContext(tone);
  }

  function rampStateGain(targetGain: number, rampSeconds: number): void {
    if (stateGain === null) {
      return;
    }

    const now = toneModule?.now();

    if (now === undefined) {
      return;
    }

    stateGain.gain.linearRampTo(targetGain, rampSeconds, now);
  }

  async function tearDownFailedInitialization(tone: ToneModule): Promise<void> {
    audioSessionStarted = false;
    audioContextActive = false;

    const transport = tone.getTransport();
    transport.stop();
    transport.cancel(0);
    transport.position = "0:0:0";

    if (activeTrack !== null) {
      disposeActiveTrack(activeTrack);
      activeTrack = null;
    }

    disposeMasterChain();
    await suspendAudioContext(tone);
  }

  async function setPageVisible(visible: boolean): Promise<void> {
    if (pageVisible && !visible) {
      invalidateStartup();
    }

    pageVisible = visible;
    visibilityRevision += 1;
    const currentRevision = visibilityRevision;

    if (disposed) {
      return;
    }

    if (!visible) {
      audioContextActive = false;
      applyAudibleState(SILENCE_RAMP_SECONDS);

      if (!audioSessionStarted) {
        return;
      }

      await waitForSilenceRamp();

      if (
        disposed ||
        pageVisible ||
        currentRevision !== visibilityRevision
      ) {
        return;
      }

      if (toneModule !== null) {
        await suspendAudioContext(toneModule);
      }
      return;
    }

    if (playbackLevel === "idle" || !radioEnabled) {
      return;
    }

    if (pendingStartupIntentId !== null && activeTrack === null) {
      await runPendingStartup(pendingStartupIntentId);
      return;
    }

    if (!audioSessionStarted || activeTrack === null) {
      return;
    }

    if (toneModule === null) {
      return;
    }

    await startAudioContext(toneModule);

    if (
      !disposed &&
      pageVisible &&
      radioEnabled &&
      currentRevision === visibilityRevision
    ) {
      applyAudibleState(SILENCE_RAMP_SECONDS);
    }
  }

  function dispose(): void {
    if (disposed) {
      return;
    }

    disposed = true;
    pendingStartupIntentId = null;
    invalidateStartup();
    visibilityRevision += 1;

    if (toneModule !== null) {
      const transport = toneModule.getTransport();
      transport.stop();
      transport.cancel(0);
      transport.position = "0:0:0";
    }

    if (activeTrack !== null) {
      disposeActiveTrack(activeTrack);
      activeTrack = null;
    }

    disposeMasterChain();
  }

  function disposeMasterChain(): void {
    masterGain?.dispose();
    stateGain?.dispose();
    limiter?.dispose();
    masterGain = null;
    stateGain = null;
    limiter = null;
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

function getReferenceMasterGain(tone: ToneModule): number {
  const {
    volumeValue,
    minimumDb,
    maximumDb,
  } = LATE_LIBRARY_MASTER;

  return tone.dbToGain(
    minimumDb + (volumeValue / 100) * (maximumDb - minimumDb),
  );
}

function waitForSilenceRamp(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, SILENCE_RAMP_SECONDS * 1000);
  });
}

async function suspendAudioContext(tone: ToneModule): Promise<void> {
  const context = tone.getContext();

  if (!context.isOffline) {
    await (context.rawContext as AudioContext).suspend();
  }
}

function disposeActiveTrack(track: ActiveTrack): void {
  for (const disposable of track.disposables.reverse()) {
    disposable.dispose();
  }
}

async function createActiveTrack(
  tone: ToneModule,
  composition: LateLibraryComposition,
  masterGain: Tone.Gain,
  isStartupCurrent: () => boolean,
): Promise<ActiveTrack | null> {
  const disposables: Disposable[] = [];
  const own = <NodeType extends Disposable>(node: NodeType): NodeType => {
    disposables.push(node);
    return node;
  };

  try {
    const trackTone = own(
      new tone.EQ3({
        low: composition.warmth.lowDb,
        mid: composition.warmth.midDb,
        high: composition.warmth.highDb,
        lowFrequency: 260,
        highFrequency: 3800,
      }),
    ).connect(masterGain);
    const output = own(new tone.Gain(0)).connect(trackTone);

    const kickLevel = own(new tone.Gain(tone.dbToGain(-10.5))).connect(output);
    const kick = own(
      new tone.MembraneSynth({
        pitchDecay: 0.035,
        octaves: 3,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.002,
          decay: 0.2,
          sustain: 0,
          release: 0.08,
        },
      }),
    ).connect(kickLevel);

    const snareLevel = own(new tone.Gain(tone.dbToGain(-16.5))).connect(output);
    const snareFilter = own(
      new tone.Filter({
        type: "bandpass",
        frequency: 1750,
        Q: 0.75,
      }),
    ).connect(snareLevel);
    const snare = own(
      new tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: {
          attack: 0.001,
          decay: 0.09,
          sustain: 0,
          release: 0.035,
        },
      }),
    ).connect(snareFilter);

    const snareBodyLevel = own(new tone.Gain(tone.dbToGain(-18.5))).connect(output);
    const snareBody = own(
      new tone.MembraneSynth({
        pitchDecay: 0.012,
        octaves: 0.7,
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.001,
          decay: 0.065,
          sustain: 0,
          release: 0.025,
        },
      }),
    ).connect(snareBodyLevel);

    const hatLevel = own(
      new tone.Gain(tone.dbToGain(-23 + composition.hatTrimDb)),
    ).connect(output);
    const hatFilter = own(
      new tone.Filter({
        type: "highpass",
        frequency: 5400,
        Q: 0.4,
      }),
    ).connect(hatLevel);
    const hat = own(
      new tone.NoiseSynth({
        noise: { type: "white" },
        envelope: {
          attack: 0.001,
          decay: 0.032,
          sustain: 0,
          release: 0.012,
        },
      }),
    ).connect(hatFilter);

    const chordLevel = own(new tone.Gain(tone.dbToGain(-13))).connect(output);
    const chordReverb = own(
      new tone.Reverb({
        decay: composition.reverbDecay,
        preDelay: 0.012,
        wet: composition.reverbWet,
      }),
    ).connect(chordLevel);
    const chordChorus = own(
      new tone.Chorus({
        frequency: 0.32,
        delayTime: 2.8,
        depth: 0.18,
        spread: 35,
        wet: composition.chorusWet,
      }),
    )
      .connect(chordReverb)
      .start();
    const chordFilter = own(
      new tone.Filter({
        type: "lowpass",
        frequency: composition.chordFilterFrequency,
        rolloff: -12,
        Q: 0.55,
      }),
    ).connect(chordChorus);
    const chords = own(
      new tone.PolySynth(tone.Synth, {
        oscillator: { type: composition.chordOscillator },
        envelope: {
          attack: composition.chordAttack,
          decay: 0.18,
          sustain: 0.48,
          release: composition.chordRelease,
        },
      }),
    ).connect(chordFilter);
    chords.maxPolyphony = 10;

    const bassLevel = own(
      new tone.Gain(tone.dbToGain(-12.5 + composition.bassTrimDb)),
    ).connect(output);
    const bassFilter = own(
      new tone.Filter({
        type: "lowpass",
        frequency: 620,
        Q: 0.35,
      }),
    ).connect(bassLevel);
    const bass = own(
      new tone.MonoSynth({
        oscillator: { type: composition.bassOscillator },
        filter: { type: "lowpass", frequency: 680, Q: 0.4 },
        envelope: {
          attack: 0.012,
          decay: 0.16,
          sustain: 0.48,
          release: 0.14,
        },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.12,
          sustain: 0.28,
          release: 0.15,
          baseFrequency: 110,
          octaves: 1.9,
        },
      }),
    ).connect(bassFilter);

    const melodyLevel = own(
      new tone.Gain(tone.dbToGain(-16.5 + composition.melodyTrimDb)),
    ).connect(output);
    const melodyDelay = own(
      new tone.FeedbackDelay({
        delayTime: "8n",
        feedback: 0.12,
        wet: composition.delayWet,
      }),
    ).connect(melodyLevel);
    const melodyFilter = own(
      new tone.Filter({
        type: "lowpass",
        frequency: 3600,
        rolloff: -12,
        Q: 0.4,
      }),
    ).connect(melodyDelay);
    const melody = own(
      new tone.FMSynth({
        harmonicity: composition.melodyHarmonicity,
        modulationIndex: composition.melodyModulationIndex,
        oscillator: { type: composition.melodyOscillator },
        modulation: { type: "sine" },
        envelope: {
          attack: 0.012,
          decay: 0.14,
          sustain: 0.32,
          release: 0.28,
        },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.12,
          sustain: 0.18,
          release: 0.22,
        },
      }),
    ).connect(melodyFilter);

    await chordReverb.ready;

    if (!isStartupCurrent()) {
      for (const disposable of disposables.reverse()) {
        disposable.dispose();
      }

      return null;
    }

    const kickPart = own(
      configureLoop(
        new tone.Part<TimedDrumHit>((scheduledTime, hit) => {
          kick.triggerAttackRelease("C1", "16n", scheduledTime, hit.velocity);
        }, composition.kick),
      ),
    );
    const snarePart = own(
      configureLoop(
        new tone.Part<TimedDrumHit>((scheduledTime, hit) => {
          snare.triggerAttackRelease("16n", scheduledTime, hit.velocity);
          snareBody.triggerAttackRelease(
            "G2",
            "32n",
            scheduledTime,
            hit.velocity * 0.48,
          );
        }, composition.snare),
      ),
    );
    const hatPart = own(
      configureLoop(
        new tone.Part<TimedDrumHit>((scheduledTime, hit) => {
          hat.triggerAttackRelease("32n", scheduledTime, hit.velocity);
        }, composition.hats),
      ),
    );
    const chordPart = own(
      configureLoop(
        new tone.Part<TimedChord>((scheduledTime, chord) => {
          const rhythmicDuration = chord.duration === "2n." ? "2n" : chord.duration;
          chords.triggerAttackRelease(
            chord.notes,
            rhythmicDuration,
            scheduledTime,
            chord.velocity,
          );
        }, composition.chords),
      ),
    );
    const bassPart = own(
      configureLoop(
        new tone.Part<TimedNote>((scheduledTime, note) => {
          bass.triggerAttackRelease(
            note.note,
            note.duration,
            scheduledTime,
            note.velocity,
          );
        }, composition.bass),
      ),
    );
    const melodyPart = own(
      configureLoop(
        new tone.Part<TimedNote>((scheduledTime, note) => {
          melody.triggerAttackRelease(
            note.note,
            note.duration,
            scheduledTime,
            note.velocity,
          );
        }, composition.melody),
      ),
    );

    void kickPart;
    void snarePart;
    void hatPart;
    void chordPart;
    void bassPart;
    void melodyPart;

    return { output, disposables };
  } catch (error) {
    for (const disposable of disposables.reverse()) {
      disposable.dispose();
    }

    throw error;
  }
}
