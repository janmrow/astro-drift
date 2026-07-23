# Engineering Principles

This document exists for three reasons: it keeps the project honest with itself as it grows (a reference point for "does this fit, or is it drifting"), it gives any AI agent working on this codebase a shared standard to reason against instead of generic best-practice instincts, and it tells anyone reading this repo — a fellow SDET, a curious stranger — what this codebase is actually trying to be.

These principles are defaults, not universal laws. A concrete project need may justify departing from one of them, but the trade-off should be explicit in the change, issue, or ADR rather than introduced by accident.

None of this is currently enforced by tooling. It is a reference, not a gate.

## 1. Functional core, imperative shell

Astro Drift has game rules that should change independently from browser and
presentation effects. Keeping those concerns separate makes game behavior
directly testable. The detailed architectural decision is documented in
[ADR-001](ADR-001-separate-engine-from-rendering.md).

**Default:** Put game rules and state transitions in `src/game/`. Pass external inputs such as elapsed time and randomness into the core explicitly.

**Avoid:** Imports by `src/game/` from rendering, input, storage, or `main.ts`, and
direct use in game modules of browser APIs, the system clock, or unseeded
randomness. Shell, rendering, input, and storage modules may depend on game
modules; the reverse dependency is the one to prevent.

**Exception:** If a rule genuinely depends on an external capability, keep the effect in the shell and pass the smallest required value or function into the core.

## 2. YAGNI

Astro Drift is intentionally a small game. Speculative flexibility adds code and
reading cost before a concrete requirement exists. Introduce abstractions when an
actual variation, repeated pattern, or architectural boundary makes their value
visible.

**Default:** Implement the current requirement directly and locally. Introduce an abstraction when a real variation, repeated pattern, or architectural boundary makes its benefit concrete.

**Avoid:** Options with no current caller, interfaces with one hypothetical implementation, and generalized paths added only because a future feature seems likely.

**Exception:** Small seams that preserve the functional-core boundary or make nondeterministic behavior explicit may be justified even before multiple implementations exist.

## 3. Boring code over clever code

Given a choice between a concise but cognitively dense TypeScript construct and a plainer, slightly more verbose equivalent, the plainer one normally wins here. In practice this means going easy on advanced generics, utility-type gymnastics, and point-free or heavily chained styles in favor of straightforward functions, explicit types, and ordinary control flow.

This is a direct fit for what this codebase is for: a portfolio and learning artifact meant to be legible to someone who is not necessarily a TypeScript specialist — a junior engineer, or someone coming from Python or Swift. Nobody reading this project is here to admire clever type-level tricks; they are here to see engineering judgment, and judgment reads better in plain code than in dense code.

This is not a ban on advanced language features. A more sophisticated construct is appropriate when it provides a clear, concrete benefit — for example, preventing a demonstrated class of errors — without making the surrounding code harder to understand.

**Default:** Prefer named functions, explicit domain types, exhaustive control flow, and code that can be understood locally.

**Avoid:** Abstractions or type-level machinery whose main benefit is brevity, novelty, or demonstrating language knowledge.

**Exception:** Use the more advanced option when its safety or maintainability benefit is visible and outweighs its reading cost.

## 4. Test invariants, not only examples

Do not ask only "what example inputs should I test?" Also ask "what must remain true across a wide range of valid inputs?" For example, a player's position should never leave the screen bounds, and while the game remains in the `running` state, its score should not decrease between consecutive updates.

Property-based tests generate varied inputs and check that these invariants hold, rather than relying only on a curated handful of examples. They complement example-based tests: examples are often better at documenting specific cases, while properties are better at exploring a broad input space and exposing edge cases a human may not write by hand.

The functional core accepts important external inputs explicitly, making broad
and reproducible rule testing practical. [Test Strategy](TEST_STRATEGY.md) owns
the current test-layer boundaries and RNG and reproducibility details.

**Default:** Use focused example-based tests for concrete behavior and property-based tests for stable domain invariants.

**Avoid:** Properties that are too broad to be true across state transitions, or that merely restate the implementation instead of a domain rule.

**Exception:** Do not force property-based testing onto behavior that is better explained by a few clear examples or verified at another test layer.

## 5. Composition over inheritance

Model the game's state as plain data — objects and union types — and operate on it with functions, rather than reaching first for class hierarchies or classic object-oriented design patterns.

At the current scale of this game — one player type, a small set of asteroid behaviors, and simple state — inheritance and pattern-heavy object models would add coordination machinery that the problem does not require. Where genuine variation in behavior appears, a union type plus an exhaustive function should be the first option considered.

This does not make classes, interfaces, or named design patterns forbidden. A small interface can be a useful contract at a real system boundary, and a pattern can be justified when the problem it solves is actually present. The point is to use those tools in response to concrete complexity, not to introduce them by default.

**Default:** Prefer plain data, small functions, union types, and explicit composition.

**Avoid:** Inheritance hierarchies, factories, strategies, or observers introduced for hypothetical variants at the project's current scale.

**Exception:** Use a class, interface, or established pattern when it makes an existing boundary or behavior substantially clearer than the simpler alternatives.
