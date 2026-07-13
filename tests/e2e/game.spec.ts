import { expect, test } from "@playwright/test";

test("loads the initial game contract", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByTestId("game-status")).toHaveText("idle");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0:00");
  await expect(page.getByTestId("asteroid-count")).toHaveText("0");
});

for (const actionKey of ["Enter", "Space"]) {
  test(`starts the game with the ${actionKey} key`, async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("game-status")).toHaveText("idle");

    await page.keyboard.press(actionKey);

    await expect(page.getByTestId("game-status")).toHaveText("running");
  });
}

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
  await expect
    .poll(async () => Number(await score.textContent()))
    .toBeGreaterThan(0);
  await expect(survivalTime).not.toHaveText("0:00");
  await expect
    .poll(async () => Number(await asteroidCount.textContent()))
    .toBeGreaterThan(0);
});

test("scopes aria-live to the status announcement only", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status-panel")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("game-stats-panel")).not.toHaveAttribute("aria-live");
});

test("saves the best score when the tab is hidden mid-run", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect
    .poll(async () => Number(await page.getByTestId("game-score").textContent()))
    .toBeGreaterThan(0);

  const scoreBeforeHiding = Number(await page.getByTestId("game-score").textContent());

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  const storedBestScore = await page.evaluate(() =>
    Number(localStorage.getItem("astro-drift-best-score")),
  );

  expect(storedBestScore).toBeGreaterThanOrEqual(scoreBeforeHiding);
});
