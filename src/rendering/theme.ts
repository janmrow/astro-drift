export const PALETTE = {
  backgroundTop: "#100c24",
  backgroundMid: "#21143b",
  backgroundBottom: "#352047",
  starFar: "#a99cac",
  starNear: "#efe4d2",
  textPrimary: "#efe4d2",
  textMuted: "#b9afc3",
  accentCopper: "#b8784d",
  accentAmber: "#d6a35d",
  lineMuted: "#765064",
  hudPanel: "#261a37",
  playerHull: "#cfc7be",
  playerShadow: "#84747a",
  asteroidStandard: "#443740",
  asteroidFacet: "#66515d",
  asteroidMark: "#2a232c",
  asteroidFiery: "#2b2022",
  asteroidHeat: "#c94f32",
  asteroidHeatBright: "#f09a55",
  stateScrim: "#02050c",
  vignette: "#000000",
} as const;

export type FontFamilies = {
  sans: string;
  monospace: string;
};

export const FONT_SCALE = {
  hudLabel: 9,
  stateLabel: 11,
  controlHint: 14,
  stateData: 15,
  pointPopup: 17,
  stateBest: 18,
  hudValue: 19,
  stateAction: 19,
  body: 20,
  idleAction: 22,
  gameOverScore: 64,
  idleTitle: 66,
} as const;

export function fontStyle(
  size: keyof typeof FONT_SCALE,
  fontFamily: string,
  weight = 400,
): string {
  return `${weight} ${FONT_SCALE[size]}px ${fontFamily}`;
}
