# Visual Style Constraints & Current Decisions

## Purpose

This document records the durable rendering constraints and current visual
decisions for Astro Drift. It is not a pixel-perfect specification or a complete
palette catalog. Its purpose is to keep future visual work consistent with the
implemented Twilight Cartography direction, the game/rendering boundary, and the
small-game scope.

If a future proposal conflicts with these constraints, resolve that conflict
explicitly rather than allowing the implementation and documentation to drift.

## Priorities, in order

When a style decision creates tension between these, resolve in this order:

1. **Playability** — the game must read clearly and feel responsive. No visual choice
   is worth confusing collision feedback or making the play field hard to parse.
2. **Testability** — the engine/rendering separation and DOM status hooks must remain
   intact. Visual changes should not require new ways of asserting game state.
3. **Performance** — the game should run smoothly on modest hardware and across
   browsers, not just on the developer's machine.
4. **Architectural clarity** — ADR-001 boundaries stay legible; a visual change
   should not blur where game rules end and drawing begins.

Fun is a legitimate design driver throughout — a rule that adds ceremony without
serving one of the four priorities above is a candidate for being relaxed, not a
reason to add process for its own sake.

## Non-negotiable constraints

These come directly from decisions already made in the repo and should not be
silently reversed by a style change:

- **Code-as-graphics.** No image, font, or audio assets. The game scene is produced
  by Canvas 2D drawing calls, while the observation frame and hidden browser
  contract remain HTML/CSS. The current treatment also excludes glow, blur,
  filters, trails, particles, dust, and other per-frame visual effects. Introducing
  sprites, bitmaps, external fonts, or those effects is a deliberate scope change
  rather than a style tweak.
- **Engine/rendering separation (ADR-001).** Gameplay rules, proximity/collision
  logic, and scoring stay in `src/game/`. Canvas drawing and Canvas caches stay in
  `src/rendering/canvasRenderer.ts`; Canvas palette, typography scale, and the
  font-string helper stay in `src/rendering/theme.ts`. DOM styling and the maintained
  system sans and system monospace stacks stay in `src/style.css`; `src/main.ts`
  reads and passes them to Canvas rendering as thin browser glue. Visual work should
  respect those ownership boundaries rather than moving game rules into presentation
  code.
- **Asteroid behavior and tuning stay in the game core.** Spawning and movement
  behavior live in `src/game/asteroids.ts`; density, speed, variant, and related
  tuning values live in `src/game/balance.ts`. Creation also owns the stable
  7–11-point silhouette stored in each asteroid's existing `points` array. Do not
  add presentation-only fields to game-domain types.
- **Asteroid surface details stay renderer-owned and deterministic.** The renderer
  selects bounded surface layouts from stable asteroid data, clips every mark to the
  irregular silhouette, and recomputes the result without renderer-time randomness,
  a visual-seed system, or a cache lifecycle.
- **No Canvas presentation automation.** Visual correctness is not asserted through
  pixel comparisons, screenshot assertions, or Canvas draw-call mocks. Stable DOM
  hooks remain the browser-test contract; Canvas appearance and feel remain manual.
- **Property-based tests stay focused on game rules**, not rendering. A richer visual
  layer does not imply testing draw calls; it implies, at most, unit-testing any new
  *pure* helper functions the rendering layer happens to introduce.
- **Logical Canvas sizing remains stable.** The Canvas uses `960 × 540` logical
  coordinates, displays at no more than 960 CSS pixels wide, and downscales
  proportionally. HiDPI backing-store and `devicePixelRatio` handling remain
  explicitly deferred.

## Current Twilight Cartography decisions

### Product shell and field

- The game sits inside a restrained observation frame with clipped corners and the
  label `CHART WINDOW · SECTOR 17`; it is an aperture, not a cockpit or dashboard.
- The Canvas uses a deep indigo-to-violet field with a restrained vignette. Both
  full-frame gradients are cached once at the renderer boundary.
- The initial field contains exactly 50 stars: 35 far and 15 near. The two layers
  retain circular shapes, separate size/speed roles, horizontal parallax, and the
  existing creation-and-wrap lifecycle.
- Reduced motion suppresses ambient star movement in idle and game-over states;
  running gameplay motion remains active.

### Player and hazards

- The player is a rounded, friendly survey craft drawn inside the unchanged
  `72 × 54` gameplay footprint and unchanged hitbox. Its hull is a stroke-free flat
  shape with restrained construction details and a clear canopy.
- One short static engine impulse is visible only while the game is running. It has
  no animation, glow, trail, or particle effect.
- Standard and fiery asteroids share classic irregular 7–11-point rocky silhouettes
  and use stroke-free flat fills. Standard rocks use sparse facets and crater marks;
  fiery rocks use flat heated surface patches without cracks, glow, or an incoming
  warning cue.

### Interface and typography

- The running HUD is a compact two-column panel shown only while the game is
  running. Idle and game-over states use separate left-aligned editorial
  compositions, so the HUD does not remain underneath them.
- Canvas UI and state text use filled glyphs without outlines. System sans serves
  titles, descriptive copy, and actions; system monospace serves labels, values,
  control hints, and pass feedback.
- Pass feedback keeps its rise-and-fade behavior as centered filled monospace text,
  without a panel, outline, underline, or glow.

## Rendering cost model

Canvas 2D is immediate-mode: every frame repaints from scratch, and cost is driven
by what you ask it to compute, not by scene complexity in the abstract. Use this as
a budget when evaluating any style proposal:

| Cost tier | Operations | Notes |
|---|---|---|
| Cheap (use freely) | flat `fill`/`stroke`, alpha blending, `translate`/`rotate`/`scale`, bounded path geometry | This is the safe default for most drawing |
| Moderate (cache or bound it) | gradients, `roundRect`, text rendering | Fine in small numbers or when created once and reused; expensive if rebuilt every frame per object |
| Expensive (use sparingly, budget explicitly) | `shadowBlur`/glow, `ctx.filter` (blur, etc.) | Cost scales with object count and blur radius; a handful of instances is fine, applying it per-asteroid at scale is not |
| Avoid at current scale | full-frame software filters, per-frame `getImageData`/pixel manipulation | Disproportionate cost for a 2D arcade game of this scope |

Gradients in `src/rendering/canvasRenderer.ts` (`backgroundGradient` and
`vignetteGradient`) are cached as module-level variables built once behind `if (!x)`
guards, not recreated per frame. Keep new gradient work to that same pattern.

## Change control

Exact palette tokens, type sizes, spacing, and opacity may be tuned when a concrete
readability problem justifies it. Changes to logical sizing, hitboxes, star counts,
shape ownership, rendering randomness, test boundaries, or the selected player,
hazard, and HUD language are broader decisions and should be reviewed explicitly.

## Techniques that change a rendering *assumption*, not just a *look*

Some visual techniques are cheap and appealing but quietly change how the renderer
behaves, not just how it looks. These should be adopted as an explicit decision,
not a side effect of a palette change:

- **Motion trails via translucent background fill** (painting a semi-transparent
  rect instead of a fully opaque one each frame) breaks the current assumption that
  every frame is rendered independently from a clean state — frame N becomes
  dependent on frame N-1's pixels. It stays entirely inside the rendering layer and
  does not violate ADR-001, but it's a real change to the render loop's contract and
  should be tuned/tested against actual gameplay speed (asteroid density and
  velocity behavior in `src/game/asteroids.ts` and tuning in
  `src/game/balance.ts`), not judged from a slow mockup.

  **Attempted 2026-07 and reverted.** Every existing draw call that is (a)
  translucent and (b) drawn at a fixed screen position every frame silently
  compounds with its own residue once the canvas stops being fully cleared
  each frame. At the time of the experiment, that affected the vignette, HUD
  scrim, idle/game-over scrims, and player-area guide line; some of those elements
  have since been removed. Each interaction was discovered reactively from a bug
  report rather than up front. Before attempting this again, audit every translucent,
  fixed-position draw call that exists at that time and decide how each is excluded
  from the trail — don't discover them one at a time from bug reports.
- **`roundRect()`** is Baseline widely available (since October 2025) and safe to
  use without a polyfill.
- Any technique that would require reading pixels back (`getImageData`) or
  persisting off-screen canvases should be treated as a bigger architectural
  conversation, not a style choice.

## Testability implications of a richer rendering layer

- Canvas style tokens (palette and typography scale) should stay as plain data in
  `src/rendering/theme.ts`, not computed inline — this doesn't make them unit-tested
  by itself, but it keeps them easy to reason about and swap without touching
  drawing logic. DOM tokens stay in `src/style.css`.
- `prefers-reduced-motion` is already read via `window.matchMedia` in `src/main.ts`
  and gates star motion through `ambientMotionSuppressed`. Any new motion-based
  style work should route through the same flag rather than adding a parallel
  check.
- `src/main.ts` reads the computed sans and monospace stacks from the styled Canvas
  and passes them to rendering; `src/style.css` remains their ownership boundary.
- Renderer-owned asteroid surface selection stays deterministic and local, while
  its Canvas clipping and appearance remain part of manual visual verification.

## Deferred work

- HiDPI backing-store support remains a separate focused follow-up. Do not introduce
  it as incidental visual work.
- Motion trails remain unapproved and require the full rendering-assumption audit
  described above before another experiment.

## References

- [ADR-001: Separate game engine from rendering](ADR-001-separate-engine-from-rendering.md)
- [Test strategy](TEST_STRATEGY.md)
