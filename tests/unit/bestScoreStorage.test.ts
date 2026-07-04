import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readBestScore, saveBestScore } from "../../src/storage/bestScoreStorage";

function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },

    clear() {
      store = {};
    },

    getItem(key: string) {
      return store[key] ?? null;
    },

    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },

    removeItem(key: string) {
      delete store[key];
    },

    setItem(key: string, value: string) {
      store[key] = value;
    },
  };
}

describe("best score storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns zero when best score is not stored", () => {
    expect(readBestScore()).toBe(0);
  });

  it("reads stored best score", () => {
    localStorage.setItem("astro-drift-best-score", "125");

    expect(readBestScore()).toBe(125);
  });

  it("reads stored best score with surrounding whitespace", () => {
    localStorage.setItem("astro-drift-best-score", " 125 ");

    expect(readBestScore()).toBe(125);
  });

  it("reads stored best score in scientific notation", () => {
    localStorage.setItem("astro-drift-best-score", "1.25e2");

    expect(readBestScore()).toBe(125);
  });

  it("rounds stored best score down to an integer", () => {
    localStorage.setItem("astro-drift-best-score", "125.9");

    expect(readBestScore()).toBe(125);
  });

  it("returns zero for invalid stored value", () => {
    localStorage.setItem("astro-drift-best-score", "not-a-score");

    expect(readBestScore()).toBe(0);
  });

  it("returns zero for negative stored value", () => {
    localStorage.setItem("astro-drift-best-score", "-10");

    expect(readBestScore()).toBe(0);
  });

  it("returns zero when localStorage.getItem throws", () => {
    vi.stubGlobal("localStorage", {
      ...createLocalStorageMock(),
      getItem: () => { throw new Error("QuotaExceededError"); },
    });

    expect(readBestScore()).toBe(0);
  });

  it("returns the computed best score when localStorage.setItem throws", () => {
    vi.stubGlobal("localStorage", {
      ...createLocalStorageMock(),
      setItem: () => { throw new Error("QuotaExceededError"); },
    })

    expect(saveBestScore(150)).toBe(150);
  });

  it("saves score as best score when it is higher than current best", () => {
    localStorage.setItem("astro-drift-best-score", "100");

    const bestScore = saveBestScore(150);

    expect(bestScore).toBe(150);
    expect(localStorage.getItem("astro-drift-best-score")).toBe("150");
  });

  it("keeps current best score when new score is lower", () => {
    localStorage.setItem("astro-drift-best-score", "200");

    const bestScore = saveBestScore(120);

    expect(bestScore).toBe(200);
    expect(localStorage.getItem("astro-drift-best-score")).toBe("200");
  });

  it("normalizes saved score before storing it", () => {
    const bestScore = saveBestScore(99.9);

    expect(bestScore).toBe(99);
    expect(localStorage.getItem("astro-drift-best-score")).toBe("99");
  });

  it("normalizes negative saved score to zero", () => {
    const bestScore = saveBestScore(-10);

    expect(bestScore).toBe(0);
    expect(localStorage.getItem("astro-drift-best-score")).toBe("0");
  });
});
