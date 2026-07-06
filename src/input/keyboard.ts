import type { InputState } from "../game/types";

type GameActionHandler = (key: string) => boolean;

export function setupKeyboardControls(
  currentInput: InputState,
  onGameActionRequested: GameActionHandler,
): void {
  window.addEventListener("keydown", (event) => {
    if (isActionKey(event.key)) {
      event.preventDefault();
      onGameActionRequested(event.key);
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
    resetFields(currentInput);
  });
}

export function resetInputState(currentInput: InputState): void {
  resetFields(currentInput);
}

function resetFields(currentInput: InputState): void {
  currentInput.up = false;
  currentInput.down = false;
  currentInput.left = false;
  currentInput.right = false;
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
    case "arrowleft":
    case "a":
      currentInput.left = isPressed;
      break;
    case "arrowright":
    case "d":
      currentInput.right = isPressed;
      break;
  }
}

function isMovementKey(key: string): boolean {
  return ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(
    key.toLowerCase(),
  );
}

function isActionKey(key: string): boolean {
  return ["r", "enter", " "].includes(key.toLowerCase());
}