import { expect, test } from "@playwright/test";

test("loads the initial game contract", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByTestId("game-status")).toHaveText("idle");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0s");
  await expect(page.getByTestId("asteroid-count")).toHaveText("0");
});

test("starts the game with keyboard action keys", async ({ page }) => {
  for (const actionKey of ["Enter", "Space"]) {
    await page.goto("/");

    await expect(page.getByTestId("game-status")).toHaveText("idle");

    await page.keyboard.press(actionKey);

    await expect(page.getByTestId("game-status")).toHaveText("running");
  }
});

test("does not start the game with the restart key", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status")).toHaveText("idle");

  await page.keyboard.press("r");

  await expect(page.getByTestId("game-status")).toHaveText("idle");
});

test("updates the browser status while running", async ({ page }) => {
  await page.goto("/");

  const score = page.getByTestId("game-score");
  const survivalTime = page.getByTestId("game-time");
  const asteroidCount = page.getByTestId("asteroid-count");

  await page.keyboard.press("Enter");

  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect(score).not.toHaveText("00000");
  await expect(survivalTime).not.toHaveText("0s");
  await expect
    .poll(async () => Number(await asteroidCount.textContent()))
    .toBeGreaterThan(0);
});
