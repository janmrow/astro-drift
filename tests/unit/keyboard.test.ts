import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInputState } from "../../src/game/engine";
import { resetInputState, setupKeyboardControls } from "../../src/input/keyboard";

function createKeyboardEvent(type: "keydown" | "keyup", key: string): KeyboardEvent {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "key", { value: key });
  return event as KeyboardEvent;
}

describe("keyboard controls", () => {
  let input: ReturnType<typeof createInputState>;
  let onGameActionRequested: ReturnType<typeof vi.fn<(key: string) => void>>;

  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());

    input = createInputState();
    onGameActionRequested = vi.fn();
    setupKeyboardControls(input, onGameActionRequested);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps WASD keys to movement state", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "w"));
    expect(input.up).toBe(true);

    window.dispatchEvent(createKeyboardEvent("keyup", "w"));
    expect(input.up).toBe(false);
  });

  it("maps arrow keys to movement state", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowLeft"));
    expect(input.left).toBe(true);

    window.dispatchEvent(createKeyboardEvent("keyup", "ArrowLeft"));
    expect(input.left).toBe(false);
  });

  it("prevents default for movement keys", () => {
    const event = createKeyboardEvent("keydown", "ArrowUp");
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not prevent default or change input for unrelated keys", () => {
    const event = createKeyboardEvent("keydown", "q");
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input).toEqual(createInputState());
  });

  it("prevents default and requests a game action for action keys", () => {
    for (const key of ["Enter", " ", "r"]) {
      onGameActionRequested.mockClear();
      const event = createKeyboardEvent("keydown", key);

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(onGameActionRequested).toHaveBeenCalledWith(key);
    }
  });

  it("resets movement input on window blur", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowUp"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowLeft"));
    expect(input.up).toBe(true);
    expect(input.left).toBe(true);

    window.dispatchEvent(new Event("blur"));

    expect(input.up).toBe(false);
    expect(input.down).toBe(false);
    expect(input.left).toBe(false);
    expect(input.right).toBe(false);
  });

  it("resets all movement fields via resetInputState", () => {
    const currentInput = {
      ...createInputState(),
      up: true,
      down: true,
      left: true,
      right: true,
    };

    resetInputState(currentInput);

    expect(currentInput.up).toBe(false);
    expect(currentInput.down).toBe(false);
    expect(currentInput.left).toBe(false);
    expect(currentInput.right).toBe(false);
  });
});
