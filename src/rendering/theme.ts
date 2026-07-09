// Shared by chrome and textMuted below — both are muted lilac by design, not
// by coincidence, so they're tied to one literal to avoid drifting apart.
const MUTED_LILAC = "#c9bfe8";

export const PALETTE = {
  playerAccent: "#ff4fa8",
  playerAccentDark: "#a82e6d",
  hazardStandard: "#7df9ff",
  hazardEscalated: "#ff6b45",
  reward: "#ffcc4d",
  chrome: MUTED_LILAC,

  textPrimary: "#f6f0ff",
  textMuted: MUTED_LILAC,

  backgroundTop: "#2a0f3d",
  backgroundMid: "#33143f",
  backgroundBottom: "#140620",

  starWarm: "#fff1e6",
  starCool: "#f2d9ff",
} as const;

// Kept in sync with the font-family in src/style.css — update both together.
export const FONT_FAMILY =
  '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace';

export const FONT_SCALE = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
  xxl: 56,
} as const;

export function fontStyle(size: keyof typeof FONT_SCALE, weight: 400 | 700 = 400): string {
  return `${weight} ${FONT_SCALE[size]}px ${FONT_FAMILY}`;
}
