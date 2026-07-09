# Visual Style Constraints & Decision Framework

## Purpose

This document is not a style guide. It does not define a color palette, typography,
or a visual direction. It exists to capture the **technical constraints and priorities**
that any future visual style decision for Astro Drift QA Lab must respect, so that
style work (palette, shapes, motion, composition) can be picked up later without
re-deriving these boundaries from scratch.

If a future style proposal conflicts with anything in this document, that conflict
should be resolved explicitly — either by adjusting the style, or by consciously
amending this document (and the underlying architecture) with a clear rationale.

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

- **Code-as-graphics.** No image, font, or audio assets. All visuals are produced by
  Canvas 2D drawing calls (paths, fills, strokes, transforms). This is a deliberate
  scope boundary, not an oversight — introducing sprites/bitmaps would be a distinct
  architectural decision, not a style tweak, and should be flagged as such if ever
  proposed.
- **Engine/rendering separation (ADR-001).** Gameplay rules, proximity/collision
  logic, and scoring stay in `src/game/`. Rendering stays in
  `src/rendering/canvasRenderer.ts`. A style change should only ever touch the
  rendering layer.
- **No Canvas pixel testing.** Visual correctness is not asserted via pixel
  comparisons. This remains true regardless of how elaborate the rendering becomes.
  DOM status hooks (`data-testid`) remain the contract E2E tests rely on.
- **Property-based tests stay focused on game rules**, not rendering. A richer visual
  layer does not imply testing draw calls; it implies, at most, unit-testing any new
  *pure* helper functions the rendering layer happens to introduce (see below).

## Rendering cost model

Canvas 2D is immediate-mode: every frame repaints from scratch, and cost is driven
by what you ask it to compute, not by scene complexity in the abstract. Use this as
a budget when evaluating any style proposal:

| Cost tier | Operations | Notes |
|---|---|---|
| Cheap (use freely) | flat `fill`/`stroke`, alpha blending, `translate`/`rotate`/`scale`, static polygon geometry computed once | This is the safe default for most drawing |
| Moderate (cache or bound it) | gradients, `roundRect`, text rendering | Fine in small numbers or when created once and reused; expensive if rebuilt every frame per object |
| Expensive (use sparingly, budget explicitly) | `shadowBlur`/glow, `ctx.filter` (blur, etc.) | Cost scales with object count and blur radius; a handful of instances is fine, applying it per-asteroid at scale is not |
| Avoid at current scale | full-frame software filters, per-frame `getImageData`/pixel manipulation | Disproportionate cost for a 2D arcade game of this scope |

Gradients in `canvasRenderer.ts` (`backgroundGradient`, `hudScrimGradient`,
`vignetteGradient`) are cached as module-level variables built once behind
`if (!x)` guards, not recreated per frame. Keep new gradient work to that same
pattern.

## Style-neutral degrees of freedom

Everything below is open and unconstrained by architecture — these are levers, not
answers:

- Color palette and semantic use of color
- Shape language (faceted vs rounded, silhouette vs outlined, point density)
- Typography (family, weight, scale, hierarchy)
- Motion and animation (idle motion, transitions, feedback juice)
- Composition (HUD layout, use of negative space, panel vs boxless UI)

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
  velocity from `engine.ts`), not judged from a slow mockup.

  **Attempted 2026-07 and reverted.** Every existing draw call that is (a)
  translucent and (b) drawn at a fixed screen position every frame silently
  compounds with its own residue once the canvas stops being fully cleared
  each frame — it hit every pre-existing fixed overlay in this file in turn
  (vignette, HUD scrim, idle/game-over scrims, the player-area guide line),
  each discovered reactively from a bug report rather than up front. Before
  attempting this again, audit every translucent, fixed-position draw call
  in this file first and decide how each is excluded from the trail — don't
  discover them one at a time from bug reports.
- **`roundRect()`** is Baseline widely available (since October 2025) and safe to
  use without a polyfill.
- Any technique that would require reading pixels back (`getImageData`) or
  persisting off-screen canvases should be treated as a bigger architectural
  conversation, not a style choice.

## Testability implications of a richer rendering layer

- Style tokens (palette, sizing constants) should stay as plain data (objects/consts),
  not computed inline — this doesn't make them unit-tested by itself, but it keeps
  them easy to reason about and swap without touching drawing logic.
- If a redesign introduces new *pure* helper functions in the rendering layer
  (e.g., a easing/interpolation helper, a color-mixing function), those are
  legitimate unit test candidates — same standard as any pure function elsewhere in
  the repo. Drawing calls themselves remain untested, as already decided.
- `prefers-reduced-motion` is already read via `window.matchMedia` in `src/main.ts`
  and gates star motion through `ambientMotionSuppressed`. Any new motion-based
  style work should route through the same flag rather than adding a parallel
  check.

## Open decisions log

Running list of things intentionally left unresolved — revisit when doing concrete
style work, don't assume an answer by default:

- ~~Faceted vs rounded shape language~~ — resolved: faceted. Player hull has an
  added shoulder/notch bevel (`PLAYER_SHIP` geometry, `canvasRenderer.ts:77-83,222-234`)
  and asteroids are irregular polygons via per-point `distanceMultiplier`
  (`asteroids.ts:210-226`).
- ~~Outlined silhouettes vs stroke-free flat shapes~~ — resolved: outlined. Ship,
  asteroids, and all HUD/overlay text use stroke+fill (`drawPlayer`, `drawAsteroid`,
  `drawOutlinedText`).
- ~~Boxed HUD panel vs boxless/floating status text~~ — resolved: boxless. The HUD
  redesign removed `HUD_PANEL` and related bounding-box constants.
- Extent of idle motion (none / subtle / prominent) and its performance budget
- Whether motion trails (see above) are worth their added render-loop complexity
- ~~Typeface family and weight strategy~~ — resolved: deliberate contrast.
  `fontStyle(size, 700)` is used for titles/emphasis, default `400` for body/muted
  text throughout `canvasRenderer.ts`.

## References

- `docs/ADR-001-separate-engine-from-rendering.md`
- `TEST_STRATEGY.md`
- Design exploration thread (mockup): style directions considered, evaluated against
  this cost model, before this document was written
