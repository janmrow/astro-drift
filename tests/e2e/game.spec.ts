import { expect, test } from "@playwright/test";

test("loads the game and starts with keyboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByTestId("game-status")).toHaveText("idle");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0s");

  await page.keyboard.press("Enter");

  await expect(page.getByTestId("game-status")).toHaveText("running");
});

test("starts the game with Space", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status")).toHaveText("idle");

  await page.keyboard.press("Space");

  await expect(page.getByTestId("game-status")).toHaveText("running");
});