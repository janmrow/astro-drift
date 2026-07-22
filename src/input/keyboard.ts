import { createInputState } from "../game/engine";
import type { InputState } from "../game/types";

type GameActionHandler = () => void;
type KeyboardResetHandler = () => void;

const GAMEPLAY_KEYS: ReadonlySet<string> = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "w",
  "s",
  "a",
  "d",
]);

export function setupKeyboardControls(
  currentInput: InputState,
  onGameActionRequested: GameActionHandler,
): KeyboardResetHandler {
  const pressedKeys = new Set<string>();

  const resetKeyboardControls = (): void => {
    pressedKeys.clear();
    Object.assign(currentInput, createInputState());
  };

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (isActionKey(key)) {
      event.preventDefault();
      onGameActionRequested();
      return;
    }

    if (!isGameplayKey(key)) {
      return;
    }

    event.preventDefault();
    pressedKeys.add(key);
    updateInputFromPressedKeys(currentInput, pressedKeys);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    if (!isGameplayKey(key)) {
      return;
    }

    event.preventDefault();
    pressedKeys.delete(key);
    updateInputFromPressedKeys(currentInput, pressedKeys);
  });

  window.addEventListener("blur", resetKeyboardControls);

  return resetKeyboardControls;
}

function updateInputFromPressedKeys(
  currentInput: InputState,
  pressedKeys: ReadonlySet<string>,
): void {
  currentInput.up = pressedKeys.has("arrowup") || pressedKeys.has("w");
  currentInput.down = pressedKeys.has("arrowdown") || pressedKeys.has("s");
  currentInput.brake = pressedKeys.has("arrowleft") || pressedKeys.has("a");
  currentInput.boost = pressedKeys.has("arrowright") || pressedKeys.has("d");
}

function isGameplayKey(key: string): boolean {
  return GAMEPLAY_KEYS.has(key);
}

function isActionKey(key: string): boolean {
  return key === "enter";
}
