import { describe, expect, it, vi } from "vitest";

import {
  createLightMusicController,
  getLightMusicTargetGain,
} from "../../src/audio/lightMusicController";
import { dbToGain } from "../../src/audio/simpleComposition";

type FakeGainParam = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};

type FakeGain = {
  gain: FakeGainParam;
  connect: ReturnType<typeof vi.fn>;
};

type FakeAudioContext = {
  fake: {
    context: AudioContext;
    createdGains: FakeGain[];
    resume: ReturnType<typeof vi.fn>;
    suspend: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    createOscillator: ReturnType<typeof vi.fn>;
    createBuffer: ReturnType<typeof vi.fn>;
    setCurrentTime: (time: number) => void;
  };
};

function createFakeGain(): FakeGain {
  return {
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(function (this: unknown) {
      return this;
    }),
  };
}

function createFakeAudioContext(): FakeAudioContext["fake"] {
  const createdGains: FakeGain[] = [];
  const resume = vi.fn(() => Promise.resolve());
  const suspend = vi.fn(() => Promise.resolve());
  const close = vi.fn(() => Promise.resolve());
  let currentTime = 10;

  const createOscillator = vi.fn(() => ({
    type: "sine",
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  const createBuffer = vi.fn(() => ({
    getChannelData: () => new Float32Array(44100),
  }));

  const context = {
    get currentTime(): number {
      return currentTime;
    },
    sampleRate: 44100,
    destination: {},
    createGain: vi.fn(() => {
      const gain = createFakeGain();
      createdGains.push(gain);
      return gain;
    }),
    createOscillator,
    createBiquadFilter: vi.fn(() => ({
      type: "highpass",
      frequency: { value: 0 },
      connect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer,
    resume,
    suspend,
    close,
  };

  return {
    context: context as unknown as AudioContext,
    createdGains,
    resume,
    suspend,
    close,
    createOscillator,
    createBuffer,
    setCurrentTime: (time: number): void => {
      currentTime = time;
    },
  };
}

function getLastTargetGain(fake: FakeAudioContext["fake"]): number | undefined {
  const calls = fake.createdGains.flatMap(
    (gain) => gain.gain.setTargetAtTime.mock.calls,
  );
  return calls.at(-1)?.[0] as number | undefined;
}

describe("light music target gain", () => {
  it("stays silent before start, when idle, muted, hidden, or disposed", () => {
    expect(getLightMusicTargetGain("running", true, true, false, false)).toBe(0);
    expect(getLightMusicTargetGain("idle", true, true, true, false)).toBe(0);
    expect(getLightMusicTargetGain("running", false, true, true, false)).toBe(0);
    expect(getLightMusicTargetGain("running", true, false, true, false)).toBe(0);
    expect(getLightMusicTargetGain("running", true, true, true, true)).toBe(0);
  });

  it("uses full level running and ducked level on game over", () => {
    expect(getLightMusicTargetGain("running", true, true, true, false)).toBe(1);

    const ducked = getLightMusicTargetGain("gameOver", true, true, true, false);
    expect(ducked).toBeCloseTo(dbToGain(-6), 10);
    expect(ducked).toBeGreaterThan(0);
    expect(ducked).toBeLessThan(1);
  });
});

describe("light music lifecycle", () => {
  it("does not create audio before an eligible user gesture", async () => {
    const fake = createFakeAudioContext();
    const createAudioContext = vi.fn(() => fake.context);
    const controller = createLightMusicController({ createAudioContext });

    controller.setRunningLevel();
    controller.setRadioEnabled(false);
    await controller.startFromUserGesture();

    expect(createAudioContext).not.toHaveBeenCalled();
    expect(fake.resume).not.toHaveBeenCalled();
  });

  it("starts on gesture and applies the running level", async () => {
    const fake = createFakeAudioContext();
    const schedulerCallbacks: (() => void)[] = [];
    const controller = createLightMusicController({
      createAudioContext: () => fake.context,
      startScheduler: (callback) => {
        schedulerCallbacks.push(callback);
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    });

    controller.setRunningLevel();
    await controller.startFromUserGesture();

    expect(fake.resume).toHaveBeenCalledOnce();
    expect(schedulerCallbacks).toHaveLength(1);
    expect(getLastTargetGain(fake)).toBe(1);
  });

  it("does not recreate the context or scheduler on a second gesture", async () => {
    const fake = createFakeAudioContext();
    const createAudioContext = vi.fn(() => fake.context);
    const startScheduler = vi.fn(
      (): ReturnType<typeof setInterval> => 1 as unknown as ReturnType<typeof setInterval>,
    );
    const controller = createLightMusicController({ createAudioContext, startScheduler });

    controller.setRunningLevel();
    await controller.startFromUserGesture();
    await controller.startFromUserGesture();

    expect(createAudioContext).toHaveBeenCalledOnce();
    expect(startScheduler).toHaveBeenCalledOnce();
    expect(fake.resume).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("allows retry after a failed graph initialization", async () => {
    const fake = createFakeAudioContext();
    fake.createBuffer.mockImplementationOnce(() => {
      throw new Error("buffer failed");
    });
    const createAudioContext = vi.fn(() => fake.context);
    const controller = createLightMusicController({ createAudioContext });

    controller.setRunningLevel();
    await expect(controller.startFromUserGesture()).rejects.toThrow("buffer failed");
    await expect(controller.startFromUserGesture()).resolves.toBeUndefined();

    expect(createAudioContext).toHaveBeenCalledTimes(2);
    expect(fake.resume).toHaveBeenCalledOnce();

    controller.dispose();
  });

  it("clamps the scheduler instead of burst-scheduling after a long pause", async () => {
    const fake = createFakeAudioContext();
    let schedulerCallback: (() => void) | undefined;
    const controller = createLightMusicController({
      createAudioContext: () => fake.context,
      startScheduler: (callback) => {
        schedulerCallback = callback;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    });

    controller.setRunningLevel();
    await controller.startFromUserGesture();
    expect(schedulerCallback).toBeDefined();

    fake.createOscillator.mockClear();
    fake.setCurrentTime(1000);
    schedulerCallback?.();

    expect(fake.createOscillator.mock.calls.length).toBeLessThanOrEqual(12);

    controller.dispose();
  });

  it("ducks on game over without restarting the scheduler", async () => {
    const fake = createFakeAudioContext();
    let schedulerStarts = 0;
    const controller = createLightMusicController({
      createAudioContext: () => fake.context,
      startScheduler: (callback) => {
        schedulerStarts += 1;
        callback();
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
    });

    controller.setRunningLevel();
    await controller.startFromUserGesture();
    controller.setGameOverLevel();

    expect(schedulerStarts).toBe(1);
    expect(getLastTargetGain(fake)).toBeCloseTo(dbToGain(-6), 10);

    controller.dispose();
  });

  it("suspends when hidden and resumes when visible again", async () => {
    const fake = createFakeAudioContext();
    const controller = createLightMusicController({
      createAudioContext: () => fake.context,
      startScheduler: () => 1 as unknown as ReturnType<typeof setInterval>,
      stopScheduler: () => undefined,
    });

    controller.setRunningLevel();
    await controller.startFromUserGesture();

    await controller.setPageVisible(false);
    expect(fake.suspend).toHaveBeenCalledOnce();

    await controller.setPageVisible(true);
    expect(fake.resume).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("dispose stops the scheduler and closes the context", async () => {
    const fake = createFakeAudioContext();
    const stopScheduler = vi.fn();
    const controller = createLightMusicController({
      createAudioContext: () => fake.context,
      startScheduler: () => 7 as unknown as ReturnType<typeof setInterval>,
      stopScheduler,
    });

    controller.setRunningLevel();
    await controller.startFromUserGesture();
    controller.dispose();

    expect(stopScheduler).toHaveBeenCalledOnce();
    expect(fake.close).toHaveBeenCalledOnce();
  });
});
