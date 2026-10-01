# Eldergrove review and implementation roadmap

Reviewed 2026-09-30. This document preserves the codebase assessment and the order of work. Check off items only after implementation and verification; record important decisions and remaining limitations here for future work.

## Purpose and boundaries

Eldergrove is a browser-based text and image RPG engine. Yearlings is the original adventure; Discovery is unfinished. The goal is to let another author create an adventure and add mechanics without changing the engine internals.

Keep the useful existing separation of adventure modules, reusable actions/conditions, and shared Svelte UI. Keep TypeScript authoring and supported custom behavior; converting everything to JSON is not required. Adventure construction is a separate workstream from engine correctness.

Do not stage, commit, create branches, push, or deploy without an explicit request. Do not start development servers without authorization. Changes should remain uncommitted.

## 1. Dependency and tooling baseline

- [x] Upgrade to Vite 8, stable Svelte 5, the latest compatible stable SvelteKit, and compatible Svelte Vite/Cloudflare adapters. Evaluate SvelteKit 3 separately based on its actual release status and migration cost.
- [x] Remove the prerelease Svelte override and migrate APIs that changed since the early Svelte 5 preview.
- [x] Update supporting packages where compatible; avoid combining unrelated major UI/CSS migrations with the engine fixes.
- [x] Establish passing type checks, production builds, lint checks, and focused engine regression tests.
- [x] Audit installed dependencies and distinguish application exposure, development-server exposure, and tooling-only advisories. Record unresolved advisories and their remediation paths.
- [ ] Follow-up: migrate to Tailwind CSS 4, including its Vite/PostCSS integration, CSS configuration, theme/custom utilities, and compatible `tailwind-merge`/`tailwind-variants` versions. Verify the existing pixel UI and dialogs retain their appearance. Keep this migration separate from the first framework/session pass.

Original lockfile: Svelte 5.0.0-next.141, SvelteKit 2.5.5, Vite 5.2.7, Cloudflare adapter 4.2.0. Published advisories include [Vite development-server access](https://github.com/vitejs/vite/security/advisories/GHSA-vg6x-rcgg-rjx6) and [SvelteKit Accept-header CPU exhaustion](https://github.com/sveltejs/kit/security/advisories/GHSA-29g2-3rmr-qm68). These links are examples, not a complete dependency audit.

## 2. Adventure switching and session ownership

- [x] Replace the single global game cache with explicitly adventure-scoped sessions.
- [x] Remove independent global location/NPC manager caches so every session owns its managers and data.
- [x] Define return-navigation behavior: preserve in-memory progress for an adventure during the current browser session; reload from its own saved checkpoint after a full reload.
- [x] Avoid mutating imported adventure definitions when restoring a save; isolate mutable definition objects between sessions.
- [x] Deduplicate concurrent initialization of the same adventure, including route preloading; recover cleanly after failed initialization.
- [x] Await initial scene setup before exposing a session.
- [x] Clean up component event subscriptions and bind them to the current session, including when a component is reused during navigation.
- [x] Verify Yearlings → Discovery → Yearlings, independent characters/managers/save keys, concurrent loads, and initialization failures.

Original findings: `src/lib/state/game.svelte.ts`, `location.svelte.ts`, and `npc.svelte.ts` each retain a singleton. The first adventure wins regardless of subsequent route. Both gameplay routes currently disable SSR; keep client sessions out of server-shared state.

## 3. Save correctness and recovery

- [x] Serialize only occupied equipment slots; unequipping previously saved an empty item ID that failed restoration.
- [x] Add a versioned save envelope, shape/range validation, content-version handling, and migrations as needed.
- [x] Recover gracefully from corrupt JSON, obsolete/missing entity IDs, unavailable storage, and write failures without silently destroying the existing save.
- [x] Define checkpoint semantics for NPC HP, world changes, shop stock, previous locations, and transient interactions.
- [x] Distinguish restoring a checkpoint from ordinary travel so restoration does not inadvertently replay exit/entry mechanics or reset counters.
- [x] Verify save/load round trips for equipment, inventory, flags, counters, and adventure isolation.

## 4. Action ordering and command lifecycle

- [x] Await location exit/enter actions; verify their ordering with a regression test.
- [x] Await inventory additions; do not let subsequent actions outrun earlier work.
- [x] Add a session-level command dispatcher with consistent busy state, errors, and cancellation/lifecycle behavior.
- [x] Prevent overlapping combat, shop, item-use, and equipment commands; verify rapid/repeated input cannot duplicate rewards or consume one item multiple times.
- [x] Route UI mutations such as equip/unequip through supported commands.
- [x] Preserve action context through branches and supported continuations, including condition evaluation and confirmation menus.
- [x] Populate encounter results consistently; publish victory before victory hooks and false for running/death.
- [x] Ensure a follow-up encounter cannot be cleared by the previous encounter's cleanup.

## 5. Typed actions and content validation

- [x] Replace optional `unknown` arguments with action-specific and condition-specific types (including extension registration).
- [x] Provide ergonomic authoring helpers that reject missing/wrong arguments at compile time.
- [x] Define explicit use of dice results in subsequent actions. Discovery's potion now heals using its dice result.
- [x] Validate duplicate IDs, referenced locations/items/NPCs/biomes, parent cycles, and asset paths.
- [x] Validate dice syntax and bounds, including unmatched parentheses and excessive dice counts.
- [x] Implement random-table `active` conditions with game state and action context.
- [x] Use useful `Error` objects and author-facing diagnostics instead of thrown strings.
- [x] Add focused tests around the interpreter and content validation, with controllable randomness and timing.

## 6. Immutable content and extensible rules

- [x] Formalize immutable adventure definitions and runtime world overrides. Both authoring helpers and session creation take deeply frozen snapshots while retaining trusted function hooks; runtime models expose writable location descriptions, shop stock, and NPC HP separately.
- [x] Define whether named NPCs persist damage between encounters; initialize their runtime state without mutating imported instances. Named NPC HP persists in the session and checkpoints; random encounters are transient.
- [x] Move the Yearlings-specific death item out of shared encounters. Yearlings configures its scene; Discovery and other adventures have a generic death screen with checkpoint/restart recovery. The rotten-rope hazard now also sets HP to zero through the shared death API.
- [x] Make combat formulas, damage/defence handling, equipment rules, progression thresholds/stat gains, and encounter win streaks configurable rule modules. All direct damage uses the defence policy, including item effects.
- [x] Handle large XP rewards crossing multiple levels, inclusive thresholds, configurable caps, and atomic gain validation. Defaults end at level 16; maximum HP gains do not heal current HP.
- [x] Register custom actions/conditions/rule hooks through a supported extension API instead of requiring core edits. Rule modules compose in order with direct adventure overrides last; scoped registrations reject duplicate names.
- [x] Preserve trusted TypeScript hooks while documenting that executable third-party adventures are code, not sandboxed data. Mutable closures remain the author's responsibility.

Verified with immutable-source/session isolation, world checkpoint round trips, rule composition/validation, combat defence and equipment policies, progression boundaries, encounter outcomes, and generic/Yearlings death recovery tests. `AUTHORING.md` documents the public rules and override model. Item turn/victory/death resolution and interaction stack ownership remain section 7; shop stock/buyback behavior remains section 8. No development server or browser playthrough was run.

## 7. Interaction and UI/content boundary

- [x] Let content request an encounter, trade, dialog, or choices without manipulating internal choice/item stacks directly. Typed session requests and declarative `encounterStart`, `dialogStart`, and `victoryShow` support new content; existing shop, confirmation, pickup, and random encounter actions use the same lifecycle.
- [x] Model explicit interaction modes: exploration, combat, shop, conversation, death, and victory, with engine-owned transitions. Yearlings' ending enters victory mode; the UI reads scene/menu views and prevents inventory mutations during prompts and terminal scenes.
- [x] Keep overlays/stacks as implementation details where useful; centralize their lifecycle and cleanup. Owned handles close only their own scene/menu, preserve new interactions opened by responses, invalidate on travel, and clear for death. Legacy raw APIs remain compatibility escape hatches and are documented as unsupported for new content.
- [x] Make inventory effects participate in combat defence, victory/death resolution, and turn rules. Default item use consumes one combat turn; `free` and `forbidden` policies are supported. Continuation prompts defer retaliation while preserving context; stale encounters cannot retaliate or reward after replacement. Item kills grant the encounter's rewards once, and lethal effects trigger recovery.
- [x] Define supported customization of presentation without making adventure modules depend on Svelte components or full mutable engine internals. Scene title/description/image and choices/messages are supported data; declarative continuations validate references before play.

Verification: 185 tests pass, including 23 new interaction tests covering nested ownership, travel, shops, victory, real Yearlings ending/bomb defence, item turns, continuation context, terminal outcomes, failure, and cancellation. Type checks, lint, Svelte analysis, and production build pass. Browser playthrough remains pending; no development server was started. Stock/buyback semantics and broader polish remain section 8.

## 8. Remaining correctness and polish

- [ ] Require sufficient funds for paid inn services; coin removal currently charges only the available amount while still granting the service.
- [ ] Implement shop stock and buyback behavior, or remove unsupported `stock`/`willBuy` promises from the model.
- [ ] Fix appending to a cleared message (`undefined` is currently prefixed) and reset message exclusivity consistently.
- [ ] Check loot tables with no matching result and define multi-result rewards.
- [ ] Check inventory ownership, quantities, equipment compatibility, and duplicate item IDs in keyed equipped-item lists (two identical items can occupy different slots).
- [ ] Remove unused/unfinished utilities after checking their intended role; cached storage effects and FSM debounce cancellation deserve review if retained.
- [ ] Reduce verbose gameplay logging and expose diagnostics intentionally.
- [ ] Reserve image dimensions, provide loading/error behavior, and review unnecessary network dependencies.
- [ ] Improve the fixed square layout for mobile, long text, keyboard navigation, accessibility, and reduced motion.
- [ ] Consider self-hosting external CSS/fonts/images for predictable availability and privacy; assess CSP once the asset strategy is settled.

## Separate workstream: adventure content

- [ ] Complete Discovery's missing locations and story (including the referenced `unknown-woods`). These are expected unfinished content, not blockers for the engine work.
- [ ] Verify Discovery's mechanics as a second-engine-consumer regression case, even before its story is complete.
- [ ] Play through Yearlings quests, death/retry, shops, Morlin, Kamul, and victory after engine changes.
- [ ] Develop an authoring guide and a minimal example adventure to support new authors. `AUTHORING.md` now documents contracts and extension examples; a complete example adventure/tutorial remains.
- [ ] Build additional adventures separately from engine implementation.

## Review evidence and limits

The initial review inspected source and used isolated logic checks with stubbed Svelte runes. Those reproduced empty-slot save restoration failure, detached inventory work, missing heal arguments producing `NaN`, appending `undefined`, and location exit work finishing after movement. A static reference check found no missing Yearlings destinations/shop items/local entity images; Discovery references the unfinished `unknown-woods` destination. Function-based hooks require additional runtime coverage.

Dependencies were absent during the original review. After the owner's `npm install`, the original `npm run check` passed with no errors or warnings. No browser playthrough or development server was run.

## Implementation log

### 2026-09-30 — dependency refresh and session isolation

- Recorded this roadmap, including a separate Tailwind 4 follow-up and adventure-content workstream.
- Upgraded to Vite 8.3.1, Svelte 5.57.1, SvelteKit 2.70.3, Svelte Vite plugin 7.3.1, Cloudflare adapter 7.2.9, Bits UI 2.19.3, TypeScript 6.0.3, ESLint 10.11.0, and Vitest 5.0.3. Supporting packages and the lockfile were refreshed. Removed the unused auto adapter and prerelease Svelte override.
- npm's SvelteKit tags were `latest: 2.70.3` and `next: 3.0.0-next.31`; chose the current stable release, not the v3 development prerelease. TypeScript 7 is not supported by the current TypeScript ESLint peer range, so selected TypeScript 6.0.3. Tailwind remains 3.4.19 until the separate v4 migration.
- Migrated reactive Map/Set names, Bits UI button/dialog wrappers and transitions, the root layout, ESLint flat configuration, and PostCSS ESM configuration. Normalized existing formatting to make the updated Prettier check pass. Runtime requirements are documented in `package.json`.
- Sessions are cached by adventure ID only in the browser, including in-flight initialization promises. Each owns a new character, data, location manager, and NPC manager; failed initialization is evicted and can be retried. Returning to an adventure retains unsaved in-memory progress, while a full reload uses its own saved checkpoint.
- Fresh sessions copy mutable adventure data without changing the imported definitions. Save restoration no longer rewrites the starting definition or runs exit hooks. Initialization awaits entry hooks; ordinary travel now awaits exit and entry hooks too.
- HP event subscriptions follow the current session and unsubscribe on replacement/unmount. Invalid inventory dialog description nesting was corrected during the Bits UI migration.
- Added seven focused engine tests using actual compiled Svelte modules, including the real Yearlings/Discovery switching sequence, independent save keys, concurrent loads, failed entry/retry, checkpoint restoration, mutable data isolation, uncached server calls, and travel lifecycle ordering.
- Verification: `npm run check`, `npm test`, `npm run lint`, and `npm run build`. No development server, browser playthrough, Git history action, or deployment was performed. Browser visual/interaction verification is still pending.
- Dependency audit: six low-severity package reports all stem from [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x), the transitive `cookie <0.7.0` dependency in the latest stable SvelteKit. No moderate/high/critical findings were reported. npm suggests unsuitable downgrades; do not apply `npm audit fix --force`. Follow up with an upstream fix or a separately assessed/tested targeted override. The application currently has no custom cookie-writing endpoints.
- Next engine priority: section 3, save correctness and recovery (especially empty equipment slots and corrupt saves).

### 2026-09-30 — checkpoint correctness and recovery

- Added version 1 checkpoints with adventure identity and an adventure `contentVersion` (default 1, explicitly set in Yearlings and Discovery). Validate shapes, safe integer ranges, entity references, equipment slots, duplicate entries, and shop layout before loading or writing. Content changes that invalidate checkpoints should increment `contentVersion`; incompatible versions are protected rather than guessed at. A future content-specific migration API remains part of extensibility work.
- Migrate legacy character/location saves in memory, including removing empty equipment IDs left by unequipping. Legacy saves have no previous location or world snapshot, so those use initial defaults. Migration does not rewrite storage until a successful explicit save.
- Checkpoints retain character equipment, inventory, flags, counters, current/previous locations, location descriptions, shop stock, and named NPC HP. Save only living characters outside active NPC encounters and item prompts. Choice confirmations, conversations, messages, random encounters, and interaction stacks are transient; restore normal location choices without replaying entry/exit actions. Arbitrary custom runtime fields are not yet persistent.
- Corrupt/incompatible saves and storage read failures start a playable fresh session with a visible notice and block overwriting the original until explicit Reset. Write failures retain the existing checkpoint and allow retries. Detect a changed checkpoint from another session before overwriting it. Reset reports storage failures instead of reloading as though removal succeeded.
- Yearlings' inn reports success only after a successful write and refunds its save fee on failure. Sufficient-funds rules remain in section 8.
- Shared session proxies now keep location/NPC managers and data collections consistent, so mutations made during play appear in world snapshots. Engine tests compile with browser rune semantics to cover this behavior.
- Verification includes legacy and versioned round trips, malformed saves, unavailable/quota-limited storage, concurrent-session protection, transient interactions, and successful/failed saves at the real Yearlings inn. Browser playthrough and visual verification remain pending; no development server was started.
- Passed all 35 engine tests, `npm run check` (zero errors/warnings), `npm run lint`, `npm run build`, Svelte autofixer analysis, and `git diff --check`. Changes remain uncommitted.
- Next engine priority: section 4, action ordering and command lifecycle.

### 2026-09-30 — action ordering and command lifecycle

- Added per-session commands with synchronous locking, reactive `busy` state, visible failure/interruption notices, and result values (`completed`, `busy`, `unavailable`, `cancelled`, `failed`). Reject overlapping inputs instead of queuing old clicks; validate menu identity and visibility again when executing. Disable mutation controls while busy and expose `aria-busy` on the game UI. Reset is also blocked while a command is active.
- UI entry points are `choose(choice)`, `useItem(item)`, `equip(item)`, and `unequip(slot)`; `runCommand(actions)` supports additional player commands. Trusted adventure hooks use and **await** `resolveActions(actions)` for nested work; they should not call `runCommand` recursively. Low-level managers remain available to trusted hooks and are not a sandbox or an automatic concurrency boundary.
- Inventory additions, equipment transfers, and Morlin's exit travel are awaited. Equipment commands check ownership before equipping. Consumables are removed before their effects start so interrupted/failed effects cannot reuse the same item; there is no general transaction rollback.
- Nested action functions now receive context as their second argument; individual action callbacks retain their existing third context argument. Branches, nested hooks/generators, shop menus, pickup prompts, and Yes/No confirmations retain context through `pushChoices`. Independent top-level commands start with a fresh context. Use `pushChoices` rather than raw stack pushes when authoring continuation menus that need context.
- Confirmation and pickup cleanup removes its own frame before running continuation actions. Combat uses the command lock throughout the player attack, delay, NPC retaliation, and victory hooks instead of temporarily stacking a blank menu. Encounter revisions and owned menu frames prevent stale attacks/rewards and preserve new encounters started by exit hooks or follow-up actions. Finished NPC/status is available during exit hooks, then cleared before follow-ups if it is still the same encounter; cleanup also runs when exit hooks fail.
- Leaving/replacing the game view calls `cancelCommand`. Built-in waits stop promptly and the interpreter stops subsequent steps. Trusted asynchronous hooks can use `commandSignal` and `throwIfCommandCancelled`; a hook that ignores cancellation must settle before the lock releases. Already completed mutations are retained, including consumed items and player damage dealt before an interrupted combat delay. This is cooperative cancellation, not rollback or forced termination of arbitrary JavaScript.
- Added 23 command regression tests covering deferred inventory lookup, duplicate/stale input, independent locks, failures, cancellation, branch/continuation context, equipment ownership/transfers, shop payments, combat rewards/retaliation, owned prompt cleanup, follow-up/exit-created encounters, and real Morlin exit travel. Browser playthrough remains pending; no development server was started.
- Verification: all 58 tests passed, `npm run check` reported zero errors/warnings, and `npm run lint`, `npm run build`, and `git diff --check` passed. Svelte autofixer found no issues; its generic effect suggestions were reviewed and retained for lifecycle cleanup and existing event-driven HP animations. Changes remain uncommitted.
- Next engine priority: section 5, typed actions and content validation. Broader interaction modes, generic death handling, item combat rules, stock enforcement, and equipment compatibility remain in their respective later sections.

### 2026-09-30 — typed authoring and content validation

- Built-in actions and conditions are discriminated unions derived from handler argument types. Required arguments, tuples, nested commands, and no-argument commands are checked by TypeScript. Runtime contracts also reject malformed dynamic commands/conditions before dispatch. Inline function actions remain supported with an undefined argument; parameterized extensions use typed registration helpers.
- Added `action`, `condition`, `choice`, `defineAdventure`, and scoped `createAuthoring().registerAction/registerCondition` helpers. Parsers infer extension argument types and validate them during construction and execution. Namespaced registrations detect duplicates within a registry, with no global mutation across adventures. Registered actions support generator continuations; conditions must return booleans. Configurable rule modules/hooks remain section 6 work.
- Numeric amounts explicitly accept `{ from: 'rollResult' }` (also exported as `rollResult`) and fail if the context has no preceding roll. Fixed the real Discovery potion; HP/NPC/currency actions reject non-finite amounts. `diceMinZero` now requires a roll too.
- Replaced the permissive dice string evaluator with a bounded parser supporting arithmetic, parentheses, unary signs, dice, and named context. It rejects invalid syntax, unknown keys, invalid count/sides, excessive nesting/tokens/length, excessive total dice, and non-finite/oversized results. Limits and integer truncation semantics are documented in `AUTHORING.md`; no JavaScript evaluation is used. Session creation accepts an injected inclusive integer random source for deterministic tests, including combat and loot.
- Session creation validates content before reading saves or initializing managers. Diagnostics cover duplicate IDs, NPC template/instance collisions, starting equipment/inventory, declarative nested action/condition references, NPC encounter/loot tables, shops, biomes, parent cycles, numeric fields, and asset paths. Trusted function bodies cannot be statically inspected; dynamic actions and ID lookups still report useful errors at execution.
- Added declarative `encounterRandomNpc` authoring support and migrated Discovery's encounter choices to it. Its explicitly declared `unresolvedLocations: ['unknown-woods']` produces a warning without preventing the unfinished adventure from loading; it does not excuse invalid starting locations, parents, or unrelated missing references. Checkpoints still reject references to unavailable locations.
- Implemented table `active` conditions using session/context. Inactive entries keep their original trigger ranges and do not reroll; no match returns an empty result, which encounter/loot consumers now handle. Consumers still use the first matching value; general multi-result loot behavior remains section 8 work.
- `npm run validate:content` verifies both current adventures against actual files in `static`, and production builds run it first. Browser validation checks path syntax; external HTTP(S) URLs are not fetched. Added `AUTHORING.md` with API, validation, extension, randomness, and cancellation guidance.
- Added 74 runtime tests plus compile-time contract assertions, covering real content/assets, the Discovery potion, scoped extensions, dynamic malformed commands, missing IDs, cycles, table conditions, and bounded deterministic dice. Existing timer/cancellation tests continue to cover interpreter timing. Browser playthrough remains pending; no development server was started.
- Verification: all 132 tests passed; `npm run check` reported zero errors/warnings; lint, content/asset checks, production build, Svelte autofixer analysis, and `git diff --check` passed. Changes remain uncommitted.
- Next engine priority: section 6, immutable content and extensible rules.
