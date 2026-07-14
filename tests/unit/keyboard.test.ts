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
  let onGameActionRequested: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());

    input = createInputState();
    onGameActionRequested = vi.fn();
    setupKeyboardControls(input, onGameActionRequested);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps W and S to vertical movement state", () => {
    for (const [key, field] of [
      ["w", "up"],
      ["s", "down"],
    ] as const) {
      window.dispatchEvent(createKeyboardEvent("keydown", key));
      expect(input[field]).toBe(true);

      window.dispatchEvent(createKeyboardEvent("keyup", key));
      expect(input[field]).toBe(false);
    }
  });

  it("maps ArrowUp and ArrowDown to vertical movement state", () => {
    for (const [key, field] of [
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
    ] as const) {
      window.dispatchEvent(createKeyboardEvent("keydown", key));
      expect(input[field]).toBe(true);

      window.dispatchEvent(createKeyboardEvent("keyup", key));
      expect(input[field]).toBe(false);
    }
  });

  it("prevents default for vertical movement keys", () => {
    for (const key of ["ArrowUp", "ArrowDown", "w", "s"]) {
      for (const eventType of ["keydown", "keyup"] as const) {
        const event = createKeyboardEvent(eventType, key);
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
    }
  });

  it("ignores horizontal keys without preventing default", () => {
    input.up = true;
    const expectedInput = { ...input };

    for (const key of ["ArrowLeft", "ArrowRight", "a", "A", "d", "D"]) {
      for (const eventType of ["keydown", "keyup"] as const) {
        const event = createKeyboardEvent(eventType, key);
        window.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(input).toEqual(expectedInput);
      }
    }
  });

  it("does not prevent default or change input for unrelated keys", () => {
    const event = createKeyboardEvent("keydown", "q");
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input).toEqual(createInputState());
  });

  it("prevents default and requests a game action for Enter", () => {
    const event = createKeyboardEvent("keydown", "Enter");

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onGameActionRequested).toHaveBeenCalledOnce();
  });

  it("does not request a game action or prevent default for Space or R", () => {
    for (const key of [" ", "r", "R"]) {
      const event = createKeyboardEvent("keydown", key);
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    }

    expect(onGameActionRequested).not.toHaveBeenCalled();
  });

  it("resets movement input on window blur", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowUp"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowDown"));
    expect(input.up).toBe(true);
    expect(input.down).toBe(true);

    window.dispatchEvent(new Event("blur"));

    expect(input.up).toBe(false);
    expect(input.down).toBe(false);
  });

  it("resets all movement fields via resetInputState", () => {
    const currentInput = {
      ...createInputState(),
      up: true,
      down: true,
    };

    resetInputState(currentInput);

    expect(currentInput.up).toBe(false);
    expect(currentInput.down).toBe(false);
  });
});
