import { createInputState } from "../game/engine";
import type { InputState } from "../game/types";

type GameActionHandler = () => void;

export function setupKeyboardControls(
  currentInput: InputState,
  onGameActionRequested: GameActionHandler,
): void {
  window.addEventListener("keydown", (event) => {
    if (isActionKey(event.key)) {
      event.preventDefault();
      onGameActionRequested();
      return;
    }

    updateInputFromKey(event.key, true, currentInput);

    if (isMovementKey(event.key)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    updateInputFromKey(event.key, false, currentInput);

    if (isMovementKey(event.key)) {
      event.preventDefault();
    }
  });

  window.addEventListener("blur", () => {
    resetInputState(currentInput);
  });
}

export function resetInputState(currentInput: InputState): void {
  Object.assign(currentInput, createInputState());
}

function updateInputFromKey(key: string, isPressed: boolean, currentInput: InputState): void {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      currentInput.up = isPressed;
      break;
    case "arrowdown":
    case "s":
      currentInput.down = isPressed;
      break;
  }
}

function isMovementKey(key: string): boolean {
  return ["arrowup", "arrowdown", "w", "s"].includes(key.toLowerCase());
}

function isActionKey(key: string): boolean {
  return key.toLowerCase() === "enter";
}
