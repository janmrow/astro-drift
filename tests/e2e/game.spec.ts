import { expect, test } from "@playwright/test";

type MutationCounts = {
  status: number;
  score: number;
  time: number;
  asteroids: number;
};

declare global {
  interface Window {
    __mutationCounts?: MutationCounts;
  }
}

test("loads the initial game contract", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-canvas")).toBeVisible();
  await expect(page.getByTestId("game-status")).toHaveText("idle");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0s");
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
  await expect(survivalTime).not.toHaveText("0s");
  await expect
    .poll(async () => Number(await asteroidCount.textContent()))
    .toBeGreaterThan(0);
});

test("goes to gameOver on collision and restarts cleanly with R", async ({ page }) => {
  // Seed 172 was found by brute-force simulation to collide with a stationary
  // player quickly (~3s), giving a fast, deterministic gameOver without
  // relying on Math.random. See src/game/rng.ts / the ?seed= query param in main.ts.
  await page.goto("/?seed=172");

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("game-status")).toHaveText("running");

  await expect(page.getByTestId("game-status")).toHaveText("gameOver", { timeout: 15_000 });

  const scoreAtGameOver = await page.getByTestId("game-score").textContent();
  const asteroidCountAtGameOver = await page.getByTestId("asteroid-count").textContent();

  expect(Number(scoreAtGameOver)).toBeGreaterThan(0);
  expect(Number(asteroidCountAtGameOver)).toBeGreaterThan(0);

  await page.keyboard.press("r");

  await expect(page.getByTestId("game-status")).toHaveText("running");
  await expect(page.getByTestId("game-score")).toHaveText("00000");
  await expect(page.getByTestId("game-time")).toHaveText("0s");
});

test("scopes aria-live to the status announcement only", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("game-status-panel")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("game-stats-panel")).not.toHaveAttribute("aria-live");
});

test("only writes status text nodes when the value actually changes", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    const counts: MutationCounts = { status: 0, score: 0, time: 0, asteroids: 0 };

    const observe = (key: keyof MutationCounts, selector: string) => {
      const element = document.querySelector(selector);

      if (!element) {
        throw new Error(`Element not found for selector: ${selector}`);
      }

      new MutationObserver(() => {
        counts[key] += 1;
      }).observe(element, { characterData: true, childList: true, subtree: true });
    };

    observe("status", "[data-testid='game-status']");
    observe("score", "[data-testid='game-score']");
    observe("time", "[data-testid='game-time']");
    observe("asteroids", "[data-testid='asteroid-count']");

    window.__mutationCounts = counts;
  });

  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);

  const counts = await page.evaluate(() => window.__mutationCounts);

  if (!counts) {
    throw new Error("Mutation counts were not recorded.");
  }

  // Status flips idle -> running, and possibly -> gameOver if a random collision
  // happens within the window, so 1 or 2 changes are both valid. At 60fps for
  // ~1.5s the loop runs roughly 90 times; if text were written every frame
  // regardless of change, all counts would track that. Change-only writes keep
  // them far lower, bounded by how many whole-number ticks actually occurred.
  expect(counts.status).toBeGreaterThanOrEqual(1);
  expect(counts.status).toBeLessThanOrEqual(2);
  expect(counts.score).toBeGreaterThan(0);
  expect(counts.score).toBeLessThan(60);
  expect(counts.time).toBeGreaterThan(0);
  expect(counts.time).toBeLessThan(60);
});
