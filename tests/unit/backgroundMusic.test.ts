import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBackgroundMusicController } from "../../src/audio/backgroundMusic";

type ToneLoader = NonNullable<
  Parameters<typeof createBackgroundMusicController>[0]
>;
type LoadedTone = Awaited<ReturnType<ToneLoader>>;

describe("background music lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { visibilityState: "visible" });
    vi.stubGlobal("window", { setTimeout });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not start Tone when the radio is disabled during lazy loading", async () => {
    let resolveTone: ((tone: LoadedTone) => void) | undefined;
    const toneStart = vi.fn<() => Promise<void>>().mockResolvedValue();
    const loadTone = vi.fn<ToneLoader>(
      () =>
        new Promise((resolve) => {
          resolveTone = resolve;
        }),
    );
    const controller = createBackgroundMusicController(loadTone);

    controller.setRunningLevel();
    const pendingStartup = controller.startFromUserGesture();
    controller.setRadioEnabled(false);
    resolveTone?.({ start: toneStart } as unknown as LoadedTone);

    await pendingStartup;
    await controller.setPageVisible(false);
    await controller.setPageVisible(true);

    expect(loadTone).toHaveBeenCalledOnce();
    expect(toneStart).not.toHaveBeenCalled();
  });

  it("finishes startup after returning to a page hidden during lazy loading", async () => {
    let resolveTone: ((tone: LoadedTone) => void) | undefined;
    const tone = createToneHarness();
    const loadTone = vi.fn<ToneLoader>(
      () =>
        new Promise((resolve) => {
          resolveTone = resolve;
        }),
    );
    const controller = createBackgroundMusicController(loadTone);

    controller.setRunningLevel();
    const pendingStartup = controller.startFromUserGesture();
    await controller.setPageVisible(false);
    resolveTone?.(tone.module);
    await pendingStartup;

    expect(tone.startContext).not.toHaveBeenCalled();
    expect(tone.transport.start).not.toHaveBeenCalled();

    await controller.setPageVisible(true);

    expect(loadTone).toHaveBeenCalledOnce();
    expect(tone.startContext).toHaveBeenCalledOnce();
    expect(tone.transport.start).toHaveBeenCalledOnce();

    controller.dispose();
  });

  it("restarts track initialization after returning to a page hidden during setup", async () => {
    const tone = createToneHarness(undefined, true);
    const controller = createBackgroundMusicController(() =>
      Promise.resolve(tone.module),
    );

    controller.setRunningLevel();
    const pendingStartup = controller.startFromUserGesture();
    await vi.waitFor(() => {
      expect(tone.hasPendingReverbPreparation()).toBe(true);
    });

    const abandonedNodes = [...tone.createdNodes];
    const pendingHide = controller.setPageVisible(false);
    tone.resolveReverbPreparation();
    await Promise.all([pendingStartup, pendingHide]);

    expect(tone.transport.start).not.toHaveBeenCalled();

    for (const node of abandonedNodes) {
      expect(node.dispose).toHaveBeenCalledOnce();
    }

    await controller.setPageVisible(true);

    expect(tone.startContext).toHaveBeenCalledTimes(2);
    expect(tone.transport.start).toHaveBeenCalledOnce();

    controller.dispose();
  });

  it("suspends a newly started context when eligibility is lost during Tone.start", async () => {
    let resolveContextStart: (() => void) | undefined;
    const suspendContext = vi.fn<() => Promise<void>>().mockResolvedValue();
    const toneStart = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveContextStart = resolve;
        }),
    );
    const loadedTone = {
      start: toneStart,
      getContext: () => ({
        isOffline: false,
        rawContext: { suspend: suspendContext },
      }),
    } as unknown as LoadedTone;
    const controller = createBackgroundMusicController(() =>
      Promise.resolve(loadedTone),
    );

    controller.setRunningLevel();
    const pendingStartup = controller.startFromUserGesture();
    await vi.waitFor(() => {
      expect(toneStart).toHaveBeenCalledOnce();
    });

    controller.setRadioEnabled(false);
    resolveContextStart?.();
    await pendingStartup;

    expect(suspendContext).toHaveBeenCalledOnce();
  });

  it.each(["reverb preparation", "Transport.start"] as const)(
    "tears down a failed audio session and permits retry after %s fails",
    async (failurePoint) => {
      const tone = createToneHarness(failurePoint);
      const controller = createBackgroundMusicController(() =>
        Promise.resolve(tone.module),
      );

      controller.setRunningLevel();

      await expect(controller.startFromUserGesture()).rejects.toBe(
        tone.initializationError,
      );

      const failedAttemptNodes = [...tone.createdNodes];

      expect(tone.startContext).toHaveBeenCalledOnce();
      expect(tone.suspendContext).toHaveBeenCalledOnce();
      expect(failedAttemptNodes.length).toBeGreaterThan(0);

      for (const node of failedAttemptNodes) {
        expect(node.dispose).toHaveBeenCalledOnce();
      }

      await expect(controller.startFromUserGesture()).resolves.toBeUndefined();

      expect(tone.startContext).toHaveBeenCalledTimes(2);
      expect(tone.transport.start).toHaveBeenCalledTimes(
        failurePoint === "Transport.start" ? 2 : 1,
      );

      controller.dispose();
    },
  );

  it("ducks game over by 6 dB and restores the running level without restarting", async () => {
    const tone = createToneHarness();
    const controller = createBackgroundMusicController(() =>
      Promise.resolve(tone.module),
    );

    controller.setRunningLevel();
    await controller.startFromUserGesture();

    const transportStartCalls = tone.transport.start.mock.calls.length;
    const transportStopCalls = tone.transport.stop.mock.calls.length;

    for (const gain of tone.createdGains) {
      gain.gain.linearRampTo.mockClear();
    }

    controller.setGameOverLevel();

    const rampedGains = tone.createdGains.filter(
      (gain) => gain.gain.linearRampTo.mock.calls.length > 0,
    );
    const [stateGain] = rampedGains;

    expect(rampedGains).toHaveLength(1);
    expect(stateGain?.gain.linearRampTo).toHaveBeenCalledOnce();
    expect(stateGain?.gain.linearRampTo).toHaveBeenLastCalledWith(
      10 ** (-6 / 20),
      0.2,
      10,
    );

    controller.setRunningLevel();

    expect(stateGain?.gain.linearRampTo).toHaveBeenLastCalledWith(1, 0.2, 10);
    expect(tone.transport.start).toHaveBeenCalledTimes(transportStartCalls);
    expect(tone.transport.stop).toHaveBeenCalledTimes(transportStopCalls);

    controller.dispose();
  });
});

type TestAudioNode = {
  dispose: ReturnType<typeof vi.fn>;
};

function createToneHarness(
  failurePoint?: "reverb preparation" | "Transport.start",
  deferFirstReverb = false,
) {
  const initializationError = new Error(`${failurePoint ?? "audio"} failed`);
  const createdNodes: TestAudioNode[] = [];
  const createdGains: MockGain[] = [];
  let shouldFailReverb = failurePoint === "reverb preparation";
  let shouldFailTransport = failurePoint === "Transport.start";
  let shouldDeferReverb = deferFirstReverb;
  let resolveReverbPreparation: (() => void) | undefined;

  class MockAudioNode {
    readonly dispose = vi.fn();
    readonly triggerAttackRelease = vi.fn();
    loop = false;
    loopEnd = "";
    maxPolyphony = 0;

    constructor() {
      createdNodes.push(this);
    }

    connect(): this {
      return this;
    }

    start(): this {
      return this;
    }

    toDestination(): this {
      return this;
    }
  }

  class MockGain extends MockAudioNode {
    readonly gain = {
      cancelScheduledValues: vi.fn(),
      linearRampTo: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
    };

    constructor() {
      super();
      createdGains.push(this);
    }
  }

  class MockReverb extends MockAudioNode {
    readonly ready: Promise<void>;

    constructor() {
      super();

      if (shouldFailReverb) {
        shouldFailReverb = false;
        this.ready = Promise.reject(initializationError);
      } else if (shouldDeferReverb) {
        shouldDeferReverb = false;
        this.ready = new Promise((resolve) => {
          resolveReverbPreparation = resolve;
        });
      } else {
        this.ready = Promise.resolve();
      }
    }
  }

  const suspendContext = vi.fn<() => Promise<void>>().mockResolvedValue();
  const startContext = vi.fn<() => Promise<void>>().mockResolvedValue();
  const transport = {
    bpm: { value: 0 },
    cancel: vi.fn(),
    position: "0:0:0",
    start: vi.fn(() => {
      if (shouldFailTransport) {
        shouldFailTransport = false;
        throw initializationError;
      }
    }),
    stop: vi.fn(),
    swing: 0,
    swingSubdivision: "",
  };
  const module = {
    Chorus: MockAudioNode,
    EQ3: MockAudioNode,
    FMSynth: MockAudioNode,
    FeedbackDelay: MockAudioNode,
    Filter: MockAudioNode,
    Gain: MockGain,
    Limiter: MockAudioNode,
    MembraneSynth: MockAudioNode,
    MonoSynth: MockAudioNode,
    NoiseSynth: MockAudioNode,
    Part: MockAudioNode,
    PolySynth: MockAudioNode,
    Reverb: MockReverb,
    Synth: MockAudioNode,
    dbToGain: (decibels: number) => 10 ** (decibels / 20),
    getContext: () => ({
      isOffline: false,
      rawContext: { suspend: suspendContext },
    }),
    getTransport: () => transport,
    now: () => 10,
    start: startContext,
  } as unknown as LoadedTone;

  return {
    createdGains,
    createdNodes,
    initializationError,
    hasPendingReverbPreparation: () => resolveReverbPreparation !== undefined,
    module,
    resolveReverbPreparation: () => {
      resolveReverbPreparation?.();
      resolveReverbPreparation = undefined;
    },
    startContext,
    suspendContext,
    transport,
  };
}
