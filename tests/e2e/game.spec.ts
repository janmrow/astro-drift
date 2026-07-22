import { expect, test, type Page } from "@playwright/test";

import { MAX_FRAME_DELTA_SECONDS } from "../../src/game/engine";

const CONTROLS_DESCRIPTION =
  "Enter starts or restarts. Arrow Up/Down or W/S steer. Arrow Left or A brakes gameplay speed. Arrow Right or D boosts gameplay speed.";

async function holdKeyForGameplayTime(
  page: Page,
  key: string,
  targetGameplayTime: number,
): Promise<void> {
  await page.keyboard.down(key);

  try {
    await page.evaluate(
      ({ maximumFrameDelta, targetTime }) =>
        new Promise<void>((resolve) => {
          let accumulatedGameplayTime = 0;
          let previousFrameTime = performance.now();

          const waitForGameplayTime = (currentFrameTime: number): void => {
            accumulatedGameplayTime += Math.min(
              (currentFrameTime - previousFrameTime) / 1_000,
              maximumFrameDelta,
            );
            previousFrameTime = currentFrameTime;

            if (accumulatedGameplayTime >= targetTime) {
              resolve();
              return;
            }

            requestAnimationFrame(waitForGameplayTime);
          };

          requestAnimationFrame(waitForGameplayTime);
        }),
      {
        maximumFrameDelta: MAX_FRAME_DELTA_SECONDS,
        targetTime: targetGameplayTime,
      },
    );
  } finally {
    await page.keyboard.up(key);
  }
}

test("loads the initial game contract", async ({ page }) => {
  await page.goto("/");

  const canvas = page.getByTestId("game-canvas");
  const controls = page.getByText(CONTROLS_DESCRIPTION, { exact: true });

  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAccessibleName("Astro Drift game canvas");
  await expect(canvas).toHaveAccessibleDescription(CONTROLS_DESCRIPTION);
  await expect(controls).toHaveCount(1);
  await expect(controls).toHaveCSS("position", "absolute");
  await expect(controls).toHaveCSS("clip-path", "inset(50%)");
  await expect(page.getByTestId("game-status")).toHaveText("idle");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0:00");
  await expect(page.getByTestId("asteroid-count")).toHaveText("0");
  await expect(page).toHaveTitle("Astro Drift");
  await expect(page.getByRole("heading", { level: 1, name: "Astro Drift" })).toHaveClass(
    "visually-hidden",
  );
  await expect(page.getByText("CHART WINDOW · SECTOR 17", { exact: true })).toBeVisible();
  await expect(page.getByText("Astro Drift QA Lab", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Prototype", { exact: true })).toHaveCount(0);
});

test("shows responsive gameplay guidance at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  const controls = page.getByText(CONTROLS_DESCRIPTION, { exact: true });
  const statusPanel = page.getByTestId("game-status-panel");
  const statsPanel = page.getByTestId("game-stats-panel");

  await expect(controls).toBeVisible();
  await expect(controls).toContainText("Enter starts or restarts.");
  await expect(controls).toContainText("Arrow Up/Down or W/S steer.");
  await expect(controls).toContainText("Arrow Left or A brakes gameplay speed.");
  await expect(controls).toContainText("Arrow Right or D boosts gameplay speed.");
  await expect(controls).not.toHaveAttribute("aria-live");
  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByText("CHART WINDOW · SECTOR 17", { exact: true })).toBeVisible();
  await expect(statusPanel).toHaveClass("visually-hidden");
  await expect(statusPanel).toHaveAttribute("aria-live", "polite");
  await expect(statsPanel).toHaveClass("visually-hidden");
  await expect(statsPanel).not.toHaveAttribute("aria-live");
});

test("starts the game with the Enter key", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status")).toHaveText("idle");

  await page.keyboard.press("Enter");

  await expect(page.getByTestId("game-status")).toHaveText("running");
});

test("does not start the game with Space or R", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status")).toHaveText("idle");

  await page.keyboard.press("Space");
  await page.keyboard.press("r");

  await expect(page.getByTestId("game-status")).toHaveText("idle");
});

test("restarts a game over round with Enter", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/");

  await page.keyboard.press("Enter");
  // Constant RNG puts the first asteroid below center; move into its band using gameplay time.
  await holdKeyForGameplayTime(page, "ArrowDown", 0.12);
  await page.keyboard.down("ArrowRight");

  try {
    await expect(page.getByTestId("game-status")).toHaveText("gameOver", { timeout: 8_000 });
  } finally {
    await page.keyboard.up("ArrowRight");
  }

  await expect(page.getByTestId("game-score")).toHaveText("00000");
  const completedRoundTime = parseFormattedTime(await page.getByTestId("game-time").textContent());

  await page.keyboard.press("Enter");

  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  const restartedRoundTime = parseFormattedTime(await page.getByTestId("game-time").textContent());

  expect(restartedRoundTime).toBeLessThan(completedRoundTime);
});

test("keeps score pass-based while survival time advances", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/");

  const score = page.getByTestId("game-score");
  const survivalTime = page.getByTestId("game-time");
  const asteroidCount = page.getByTestId("asteroid-count");

  await startGameMovingUp(page);

  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect(survivalTime).not.toHaveText("0:00");
  await expect
    .poll(async () => Number(await asteroidCount.textContent()))
    .toBeGreaterThan(0);
  await expect(score).toHaveText("00000");
  await expect(score).toHaveText("00025", { timeout: 5_000 });
  await page.keyboard.up("ArrowUp");
});

test("scopes aria-live to the status announcement only", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status-panel")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("game-stats-panel")).not.toHaveAttribute("aria-live");
});

test("saves the best score when the tab is hidden mid-run", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/");

  await startGameMovingUp(page);
  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect(page.getByTestId("game-score")).toHaveText("00025", { timeout: 5_000 });
  await page.keyboard.up("ArrowUp");

  const scoreBeforeHiding = Number(await page.getByTestId("game-score").textContent());

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  const storedBestScore = await page.evaluate(() =>
    Number(localStorage.getItem("astro-drift-best-score:v2")),
  );

  expect(storedBestScore).toBeGreaterThanOrEqual(scoreBeforeHiding);
});

async function startGameMovingUp(page: Page): Promise<void> {
  await page.keyboard.down("ArrowUp");
  await page.keyboard.press("Enter");
}

function parseFormattedTime(value: string | null): number {
  const [minutes = 0, seconds = 0] = (value ?? "").split(":").map(Number);
  return minutes * 60 + seconds;
}
