import { afterEach, describe, expect, it, vi } from "vitest";

import { readBestScore, saveBestScore } from "../../src/storage/bestScoreStorage";

const BEST_SCORE_KEY = "astro-drift-best-score:v2";
const LEGACY_BEST_SCORE_KEY = "astro-drift-best-score";

function stubLocalStorage(storedValue: string | null = null) {
  const getItem = vi.fn((key: string) => (key === BEST_SCORE_KEY ? storedValue : null));
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { getItem, setItem });
  return { getItem, setItem };
}

describe("best score storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns zero when best score is not stored", () => {
    stubLocalStorage();

    expect(readBestScore()).toBe(0);
  });

  it("reads stored best score", () => {
    const { getItem } = stubLocalStorage("125");

    expect(readBestScore()).toBe(125);
    expect(getItem).toHaveBeenCalledWith(BEST_SCORE_KEY);
  });

  it("ignores a best score stored only under the previous key", () => {
    const getItem = vi.fn((key: string) =>
      key === LEGACY_BEST_SCORE_KEY ? "500" : null,
    );
    vi.stubGlobal("localStorage", { getItem, setItem: vi.fn() });

    expect(readBestScore()).toBe(0);
    expect(getItem).toHaveBeenCalledWith(BEST_SCORE_KEY);
    expect(getItem).not.toHaveBeenCalledWith(LEGACY_BEST_SCORE_KEY);
  });

  it("reads stored best score with surrounding whitespace", () => {
    stubLocalStorage(" 125 ");

    expect(readBestScore()).toBe(125);
  });

  it("reads stored best score in scientific notation", () => {
    stubLocalStorage("1.25e2");

    expect(readBestScore()).toBe(125);
  });

  it("rounds stored best score down to an integer", () => {
    stubLocalStorage("125.9");

    expect(readBestScore()).toBe(125);
  });

  it("returns zero for invalid stored value", () => {
    stubLocalStorage("not-a-score");

    expect(readBestScore()).toBe(0);
  });

  it("returns zero for negative stored value", () => {
    stubLocalStorage("-10");

    expect(readBestScore()).toBe(0);
  });

  it("returns zero when localStorage.getItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("QuotaExceededError"); },
      setItem: vi.fn(),
    });

    expect(readBestScore()).toBe(0);
  });

  it("returns the computed best score when localStorage.setItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => { throw new Error("QuotaExceededError"); },
    });

    expect(saveBestScore(150)).toBe(150);
  });

  it("saves score as best score when it is higher than current best", () => {
    const { setItem } = stubLocalStorage("100");

    const bestScore = saveBestScore(150);

    expect(bestScore).toBe(150);
    expect(setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, "150");
  });

  it("keeps current best score when new score is lower", () => {
    const { setItem } = stubLocalStorage("200");

    const bestScore = saveBestScore(120);

    expect(bestScore).toBe(200);
    expect(setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, "200");
  });

  it("normalizes saved score before storing it", () => {
    const { setItem } = stubLocalStorage();

    const bestScore = saveBestScore(99.9);

    expect(bestScore).toBe(99);
    expect(setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, "99");
  });

  it("normalizes negative saved score to zero", () => {
    const { setItem } = stubLocalStorage();

    const bestScore = saveBestScore(-10);

    expect(bestScore).toBe(0);
    expect(setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, "0");
  });
});
