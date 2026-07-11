# Engineering Principles

This document exists for three reasons: it keeps the project honest with itself as it grows (a reference point for "does this fit, or is it drifting"), it gives any AI agent working on this codebase a shared standard to reason against instead of generic best-practice instincts, and it tells anyone reading this repo — a fellow SDET, a curious stranger — what this codebase is actually trying to be.

These principles are defaults, not universal laws. A concrete project need may justify departing from one of them, but the trade-off should be explicit in the change, issue, or ADR rather than introduced by accident.

None of this is currently enforced by tooling. It is a reference, not a gate. See the note on enforcement at the end.

## 1. Functional core, imperative shell

The idea, in short: split the codebase into two zones with fundamentally different natures. One zone contains pure functions — they take data in, return data out, and never touch the outside world. The other zone is a thin shell around it, and only the shell is allowed to perform effects such as drawing, reading input, accessing storage, reading the system clock, or producing randomness that was not explicitly passed in.

This fits a small arcade game unusually well, because the two things that actually change independently in this project *are* game rules and presentation. A visual redesign — new palette, new HUD layout, motion trails — should not require touching how asteroids move or collide. Conversely, a change to the movement model should not care what color anything is drawn in. The architecture mirrors the two kinds of change this project actually goes through.

What it is worth in practice: game logic can be unit-tested without a browser, without mocks, and without a test harness pretending to be a DOM. Presentation-layer experiments — a new renderer or an audio layer — can be developed or replaced with limited impact on the correctness of the game rules underneath. The architectural decision is documented in [ADR-001](docs/ADR-001-separate-engine-from-rendering.md). The credit for naming this pattern goes to Gary Bernhardt.

**Default:** Put game rules and state transitions in `src/game/`. Pass external inputs such as elapsed time and randomness into the core explicitly.

**Avoid:** Imports from `src/game/` into rendering, input, storage, or `main.ts`, and direct use there of browser APIs, `Date.now()`, or `Math.random()`.

**Exception:** If a rule genuinely depends on an external capability, keep the effect in the shell and pass the smallest required value or function into the core.

## 2. YAGNI

You Aren't Gonna Need It: do not build an abstraction, a configuration option, or a generalized code path for a need that does not exist yet — even a need that feels inevitable. Build it when the need is concrete, not when it is merely plausible.

This project's specific risk is that its codebase has, at points, grown more complicated without a proportional amount of new functionality showing up. That is the textbook symptom of YAGNI being violated — usually with good intentions (a human or an LLM anticipating a future need) but at a real cost: more code to read and more paths to reason about, for a future that may arrive differently than predicted, or not at all. Concrete, decided-upon future work (a new movement model, audio) earns its complexity when it is actually being built — not before.

The payoff is a codebase that stays legible relative to what it currently does, which matters especially here because this project is a sandbox for trying things — new tools, new workflows, new design decisions. Speculative flexibility does not just cost reading time; it actively works against the project's own reason for existing.

**Default:** Implement the current requirement directly and locally. Introduce an abstraction when a real variation, repeated pattern, or architectural boundary makes its benefit concrete.

**Avoid:** Options with no current caller, interfaces with one hypothetical implementation, and generalized paths added only because a future feature seems likely.

**Exception:** Small seams that preserve the functional-core boundary or make nondeterministic behavior explicit may be justified even before multiple implementations exist.

Canonical reference: Extreme Programming, usually credited to Kent Beck and Ron Jeffries.

## 3. Boring code over clever code

Given a choice between a concise but cognitively dense TypeScript construct and a plainer, slightly more verbose equivalent, the plainer one normally wins here. In practice this means going easy on advanced generics, utility-type gymnastics, and point-free or heavily chained styles in favor of straightforward functions, explicit types, and ordinary control flow.

This is a direct fit for what this codebase is for: a portfolio and learning artifact meant to be legible to someone who is not necessarily a TypeScript specialist — a junior engineer, or someone coming from Python or Swift. Nobody reading this project is here to admire clever type-level tricks; they are here to see engineering judgment, and judgment reads better in plain code than in dense code.

This is not a ban on advanced language features. A more sophisticated construct is appropriate when it provides a clear, concrete benefit — for example, preventing a demonstrated class of errors — without making the surrounding code harder to understand.

**Default:** Prefer named functions, explicit domain types, exhaustive control flow, and code that can be understood locally.

**Avoid:** Abstractions or type-level machinery whose main benefit is brevity, novelty, or demonstrating language knowledge.

**Exception:** Use the more advanced option when its safety or maintainability benefit is visible and outweighs its reading cost.

The name is a nod to Brian Kernighan's observation that code should be optimized for reading, not writing. Restated for this project: boring code is the default whenever the clever alternative does not provide a clear benefit.

## 4. Test invariants, not only examples

Do not ask only "what example inputs should I test?" Also ask "what must remain true across a wide range of valid inputs?" For example, a player's position should never leave the screen bounds, and while the game remains in the `running` state, its score should not decrease between consecutive updates.

Property-based tests generate varied inputs and check that these invariants hold, rather than relying only on a curated handful of examples. They complement example-based tests: examples are often better at documenting specific cases, while properties are better at exploring a broad input space and exposing edge cases a human may not write by hand.

This follows naturally from having a pure functional core. Pure functions do not need mocking or dependency injection to test; they need inputs. The game's seeded RNG makes gameplay behavior reproducible, while `fast-check` provides its own seed and replay information for reproducing a failing generated case. These are separate mechanisms serving the same goal: failures should be diagnosable and repeatable.

**Default:** Use focused example-based tests for concrete behavior and property-based tests for stable domain invariants.

**Avoid:** Properties that are too broad to be true across state transitions, or that merely restate the implementation instead of a domain rule.

**Exception:** Do not force property-based testing onto behavior that is better explained by a few clear examples or verified at another test layer.

The lineage here is QuickCheck, originally from Haskell; `fast-check` is the JavaScript/TypeScript implementation this project uses. The broader test-layer decisions are documented in [TEST_STRATEGY.md](docs/TEST_STRATEGY.md).

## 5. Composition over inheritance

Model the game's state as plain data — objects and union types — and operate on it with functions, rather than reaching first for class hierarchies or classic object-oriented design patterns.

At the current scale of this game — one player type, a small set of asteroid behaviors, and simple state — inheritance and pattern-heavy object models would add coordination machinery that the problem does not require. Where genuine variation in behavior appears, a union type plus an exhaustive function should be the first option considered.

This does not make classes, interfaces, or named design patterns forbidden. A small interface can be a useful contract at a real system boundary, and a pattern can be justified when the problem it solves is actually present. The point is to use those tools in response to concrete complexity, not to introduce them by default.

**Default:** Prefer plain data, small functions, union types, and explicit composition.

**Avoid:** Inheritance hierarchies, factories, strategies, or observers introduced for hypothetical variants at the project's current scale.

**Exception:** Use a class, interface, or established pattern when it makes an existing boundary or behavior substantially clearer than the simpler alternatives.

Peter Norvig's well-known observation is relevant here: in languages with first-class functions, many classic design patterns become either unnecessary or straightforward to express without a large supporting structure.

## On enforcement

Nothing above is self-enforcing. Writing it down does not stop a future change — human- or agent-written — from drifting away from it. Mechanical checks should protect narrow, high-value boundaries rather than attempt to encode every stylistic preference in this document.

If enforcement is wanted later, the most promising candidate is an import-boundary check (a lint rule or a small architecture test) that protects this dependency direction:

```text
main / rendering / input / storage -> game
game -X-> main / rendering / input / storage
```

A related check could prevent modules under `src/game/` from directly using browser APIs, the system clock, or unseeded randomness. These checks would directly guard principle 1, whose violation is both consequential and easy to miss in review.

This is worth considering as a future, separate, deliberate decision — not something to bolt on merely because the principle has been written down.
