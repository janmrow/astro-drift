import { createInputState } from "../game/engine";
import type { InputState } from "../game/types";

type KeyboardResetHandler = () => void;

type KeyboardActionHandlers = {
  onGameAction: () => void;
  onRadioToggle: () => void;
};

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
  { onGameAction, onRadioToggle }: KeyboardActionHandlers,
): KeyboardResetHandler {
  const pressedKeys = new Set<string>();
  const pressedActionKeys = new Set<string>();

  const resetKeyboardControls = (): void => {
    pressedKeys.clear();
    pressedActionKeys.clear();
    Object.assign(currentInput, createInputState());
  };

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (isGameActionKey(key) || isRadioToggleKey(key)) {
      event.preventDefault();

      if (event.repeat || pressedActionKeys.has(key)) {
        return;
      }

      pressedActionKeys.add(key);

      if (isGameActionKey(key)) {
        onGameAction();
      } else {
        onRadioToggle();
      }

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

    if (isGameActionKey(key) || isRadioToggleKey(key)) {
      event.preventDefault();
      pressedActionKeys.delete(key);
      return;
    }

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

function isGameActionKey(key: string): boolean {
  return key === "enter";
}

function isRadioToggleKey(key: string): boolean {
  return key === "r";
}
