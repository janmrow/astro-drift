import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInputState } from "../../src/game/engine";
import { setupKeyboardControls } from "../../src/input/keyboard";

function createKeyboardEvent(
  type: "keydown" | "keyup",
  key: string,
  repeat = false,
): KeyboardEvent {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "key", { value: key });
  Object.defineProperty(event, "repeat", { value: repeat });
  return event as KeyboardEvent;
}

describe("keyboard controls", () => {
  let input: ReturnType<typeof createInputState>;
  let onGameActionRequested: ReturnType<typeof vi.fn<() => void>>;
  let onRadioToggleRequested: ReturnType<typeof vi.fn<() => void>>;
  let resetKeyboardControls: () => void;

  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());

    input = createInputState();
    onGameActionRequested = vi.fn();
    onRadioToggleRequested = vi.fn();
    resetKeyboardControls = setupKeyboardControls(input, {
      onGameAction: onGameActionRequested,
      onRadioToggle: onRadioToggleRequested,
    });
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

  it("maps A and D to gameplay speed state", () => {
    for (const [key, field] of [
      ["a", "brake"],
      ["d", "boost"],
    ] as const) {
      window.dispatchEvent(createKeyboardEvent("keydown", key));
      expect(input[field]).toBe(true);

      window.dispatchEvent(createKeyboardEvent("keyup", key));
      expect(input[field]).toBe(false);
    }
  });

  it("maps ArrowLeft and ArrowRight to gameplay speed state", () => {
    for (const [key, field] of [
      ["ArrowLeft", "brake"],
      ["ArrowRight", "boost"],
    ] as const) {
      window.dispatchEvent(createKeyboardEvent("keydown", key));
      expect(input[field]).toBe(true);

      window.dispatchEvent(createKeyboardEvent("keyup", key));
      expect(input[field]).toBe(false);
    }
  });

  it("keeps an action active until every held alias for it is released", () => {
    for (const [arrowKey, letterKey, field] of [
      ["ArrowUp", "w", "up"],
      ["ArrowDown", "s", "down"],
      ["ArrowLeft", "a", "brake"],
      ["ArrowRight", "d", "boost"],
    ] as const) {
      window.dispatchEvent(createKeyboardEvent("keydown", arrowKey));
      window.dispatchEvent(createKeyboardEvent("keydown", letterKey));
      window.dispatchEvent(createKeyboardEvent("keyup", letterKey));

      expect(input[field]).toBe(true);

      window.dispatchEvent(createKeyboardEvent("keyup", arrowKey));

      expect(input[field]).toBe(false);
    }
  });

  it("prevents default for gameplay keys", () => {
    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d"]) {
      for (const eventType of ["keydown", "keyup"] as const) {
        const event = createKeyboardEvent(eventType, key);
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
    }
  });

  it("does not prevent default or change input for unrelated keys", () => {
    const event = createKeyboardEvent("keydown", "q");
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input).toEqual(createInputState());
    expect(onGameActionRequested).not.toHaveBeenCalled();
    expect(onRadioToggleRequested).not.toHaveBeenCalled();
  });

  it("uses Enter only for the game action", () => {
    const event = createKeyboardEvent("keydown", "Enter");

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onGameActionRequested).toHaveBeenCalledOnce();
    expect(onRadioToggleRequested).not.toHaveBeenCalled();
  });

  it("leaves Space unrelated to game and radio actions", () => {
    const event = createKeyboardEvent("keydown", " ");

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onGameActionRequested).not.toHaveBeenCalled();
    expect(onRadioToggleRequested).not.toHaveBeenCalled();
  });

  it("uses R only for the radio toggle", () => {
    const event = createKeyboardEvent("keydown", "R");

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onGameActionRequested).not.toHaveBeenCalled();
    expect(onRadioToggleRequested).toHaveBeenCalledOnce();
  });

  it("does not repeat a held Enter game action", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "Enter"));
    window.dispatchEvent(createKeyboardEvent("keydown", "Enter", true));
    window.dispatchEvent(createKeyboardEvent("keydown", "Enter"));

    expect(onGameActionRequested).toHaveBeenCalledOnce();

    window.dispatchEvent(createKeyboardEvent("keyup", "Enter"));
    window.dispatchEvent(createKeyboardEvent("keydown", "Enter"));

    expect(onGameActionRequested).toHaveBeenCalledTimes(2);
  });

  it("does not repeat a held R radio toggle", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "r"));
    window.dispatchEvent(createKeyboardEvent("keydown", "r", true));
    window.dispatchEvent(createKeyboardEvent("keydown", "R"));

    expect(onRadioToggleRequested).toHaveBeenCalledOnce();

    window.dispatchEvent(createKeyboardEvent("keyup", "r"));
    window.dispatchEvent(createKeyboardEvent("keydown", "R"));

    expect(onRadioToggleRequested).toHaveBeenCalledTimes(2);
  });

  it("resets gameplay input on window blur", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowUp"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowDown"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowLeft"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowRight"));
    expect(input.up).toBe(true);
    expect(input.down).toBe(true);
    expect(input.brake).toBe(true);
    expect(input.boost).toBe(true);

    window.dispatchEvent(new Event("blur"));

    expect(input.up).toBe(false);
    expect(input.down).toBe(false);
    expect(input.brake).toBe(false);
    expect(input.boost).toBe(false);
  });

  it("clears both input state and tracked keys via the explicit reset", () => {
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowUp"));
    window.dispatchEvent(createKeyboardEvent("keydown", "w"));
    window.dispatchEvent(createKeyboardEvent("keydown", "ArrowRight"));
    window.dispatchEvent(createKeyboardEvent("keydown", "d"));

    resetKeyboardControls();

    expect(input).toEqual(createInputState());

    window.dispatchEvent(createKeyboardEvent("keyup", "w"));
    window.dispatchEvent(createKeyboardEvent("keyup", "d"));

    expect(input).toEqual(createInputState());
  });
});
