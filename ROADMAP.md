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
- [ ] Await inventory additions; do not let subsequent actions outrun earlier work.
- [ ] Add a session-level command dispatcher with consistent busy state, errors, and cancellation/lifecycle behavior.
- [ ] Prevent overlapping combat, shop, item-use, and equipment commands; verify rapid/repeated input cannot duplicate rewards or consume one item multiple times.
- [ ] Route UI mutations such as equip/unequip through supported commands.
- [ ] Preserve action context through branches and supported continuations. `branch` currently omits context during condition evaluation.
- [ ] Populate encounter results consistently; `ctx.encounterVictory` is declared but never assigned.
- [ ] Ensure a follow-up encounter cannot be cleared by the previous encounter's cleanup.

## 5. Typed actions and content validation

- [ ] Replace optional `unknown` arguments with action-specific and condition-specific types (including extension registration).
- [ ] Provide ergonomic authoring helpers that reject missing/wrong arguments at compile time.
- [ ] Define explicit use of dice results in subsequent actions. Discovery's potion rolls dice then calls `hpHeal` without an amount, producing `NaN`.
- [ ] Validate duplicate IDs, referenced locations/items/NPCs/biomes, parent cycles, and asset paths.
- [ ] Validate dice syntax and bounds; unmatched parentheses can currently loop forever, and invalid/huge dice counts need bounded behavior.
- [ ] Implement random-table `active` conditions or remove the unsupported field.
- [ ] Use useful `Error` objects and author-facing diagnostics instead of thrown strings.
- [ ] Add focused tests around the interpreter and content validation, with controllable randomness and timing.

## 6. Immutable content and extensible rules

- [ ] Formalize immutable adventure definitions and runtime world overrides. Session creation now recursively copies plain adventure data (retaining trusted function hooks) so sessions do not mutate imported definitions.
- [x] Define whether named NPCs persist damage between encounters; initialize their runtime state without mutating imported instances. Named NPC HP persists in the session and checkpoints; random encounters are transient.
- [ ] Move the Yearlings-specific death item out of shared encounters (`yearlings/you-die` currently breaks death in Discovery).
- [ ] Make combat formulas, damage/defence handling, equipment rules, progression thresholds/stat gains, and encounter win streaks configurable rule modules.
- [ ] Handle large XP rewards crossing multiple levels and clarify equality at progression thresholds and the maximum level.
- [ ] Register custom actions/conditions/rule hooks through a supported extension API instead of requiring core edits.
- [ ] Preserve trusted TypeScript hooks while documenting that executable third-party adventures are code, not sandboxed data.

## 7. Interaction and UI/content boundary

- [ ] Let content request an encounter, trade, dialog, or choices without manipulating internal choice/item stacks directly.
- [ ] Model explicit interaction modes: exploration, combat, shop, conversation, death, and victory, with engine-owned transitions.
- [ ] Keep overlays/stacks as implementation details where useful; centralize their lifecycle and cleanup.
- [ ] Make inventory effects participate in combat defence, victory/death resolution, and turn rules. Bomb damage currently bypasses the weapon defence path and does not resolve victory immediately.
- [ ] Define supported customization of presentation without making adventure modules depend on Svelte components or full mutable engine internals.

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
- [ ] Develop an authoring guide and a minimal example adventure to support new authors.
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
