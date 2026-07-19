export const PALETTE = {
  backgroundTop: "#100c24",
  backgroundMid: "#21143b",
  backgroundBottom: "#352047",
  starFar: "#a99cac",
  starNear: "#efe4d2",
  textPrimary: "#efe4d2",
  textMuted: "#b9afc3",
  accentAmber: "#d6a35d",
  playerHull: "#cfc7be",
  playerShadow: "#84747a",
  asteroidStandard: "#443740",
  asteroidFacet: "#66515d",
  asteroidFiery: "#2b2022",
  asteroidHeat: "#c94f32",
  vignette: "#000000",
} as const;

export type FontFamilies = {
  sans: string;
  monospace: string;
};

export const FONT_SCALE = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xxl: 56,
} as const;

export function fontStyle(
  size: keyof typeof FONT_SCALE,
  fontFamily: string,
  weight = 400,
): string {
  return `${weight} ${FONT_SCALE[size]}px ${fontFamily}`;
}
