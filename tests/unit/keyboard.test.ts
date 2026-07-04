import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInputState } from "../../src/game/engine";
import { setupKeyboardControls } from "../../src/input/keyboard";

type FakeKeyboardEvent = { key: string; preventDefault: () => void };
type Listener = (event: FakeKeyboardEvent) => void;

function createKeyEvent(key: string): FakeKeyboardEvent {
  return { key, preventDefault: vi.fn() };
}

describe("keyboard controls", () => {
  let input: ReturnType<typeof createInputState>;
  let onGameActionRequested: ReturnType<typeof vi.fn<(key: string) => boolean>>;
  let listeners: Record<string, Listener>;

  beforeEach(() => {
    listeners = {};

    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, handler: Listener) => {
        listeners[type] = handler;
      }),
    });

    input = createInputState();
    onGameActionRequested = vi.fn().mockReturnValue(false);
    setupKeyboardControls(input, onGameActionRequested);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps WASD keys to movement state", () => {
    listeners.keydown(createKeyEvent("w"));
    expect(input.up).toBe(true);

    listeners.keyup(createKeyEvent("w"));
    expect(input.up).toBe(false);
  });

  it("maps arrow keys to movement state", () => {
    listeners.keydown(createKeyEvent("ArrowLeft"));
    expect(input.left).toBe(true);

    listeners.keyup(createKeyEvent("ArrowLeft"));
    expect(input.left).toBe(false);
  });

  it("prevents default for movement keys", () => {
    const event = createKeyEvent("ArrowUp");
    listeners.keydown(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("does not prevent default or change input for unrelated keys", () => {
    const event = createKeyEvent("q");
    listeners.keydown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(input).toEqual(createInputState());
  });

  it("prevents default and requests a game action for action keys", () => {
    for (const key of ["Enter", " ", "r"]) {
      onGameActionRequested.mockClear();
      const event = createKeyEvent(key);

      listeners.keydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onGameActionRequested).toHaveBeenCalledWith(key);
    }
  });

  it("prevents default for the space key even when the game action is rejected", () => {
    onGameActionRequested.mockReturnValue(false);
    const event = createKeyEvent(" ");

    listeners.keydown(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("resets movement input on window blur", () => {
    listeners.keydown(createKeyEvent("ArrowUp"));
    listeners.keydown(createKeyEvent("ArrowLeft"));
    expect(input.up).toBe(true);
    expect(input.left).toBe(true);

    listeners.blur(createKeyEvent(""));

    expect(input.up).toBe(false);
    expect(input.down).toBe(false);
    expect(input.left).toBe(false);
    expect(input.right).toBe(false);
  });
});
