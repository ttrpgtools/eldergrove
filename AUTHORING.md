# Adventure authoring contracts

Adventures remain trusted TypeScript modules. Executable hooks are code with access to the game state; these checks are not a sandbox for third-party adventures.

## Built-in actions and conditions

Existing object literals still work. Each command now has its own argument type, so missing amounts, wrong tuple fields, and extra arguments to commands such as `messageClear` fail the type check. Helpers provide the same contracts without repeating object fields:

```ts
import { action, condition, choice, defineAdventure } from '$lib/authoring';
import { rollResult } from '$lib/arguments';

const drink = [action('diceRoll', 'd4+4'), action('hpHeal', rollResult)];

const browse = choice('Browse goods', [action('shopStart')], condition('coinsAtLeast', 10));
```

`defineAdventure` checks the `GameDef` shape at compile time and returns a frozen snapshot; `validateAdventure` performs runtime content checks. It does not execute hooks. A numeric action amount can be a literal number or `{ from: 'rollResult' }`. The latter requires a preceding `diceRoll` in the same action/continuation context; a missing result raises an error. `diceMinZero` also requires an existing roll.

`encounterRandomNpc` is available as a declarative action, so its NPC table and declarative follow-up references can be checked:

```ts
action('encounterRandomNpc', {
	table: ['my-game/rat', 'my-game/wolf'],
	followBy: [action('messageSet', 'You return to exploring.')]
});
```

Numeric actions reject non-finite or out-of-range values at execution. Keep raw function hooks for custom behavior. Inline action callbacks receive `(state, undefined, context)`; an actions-function receives `(state, context)`. For parameterized custom actions use the registration API below rather than adding arbitrary `arg` values to inline callbacks.

## Scoped action and condition extensions

Create an authoring registry for an adventure or shared extension module. Registration requires a namespaced name, a parser for runtime arguments, and a typed handler. Duplicate names within the same registry/kind fail; separate registries do not affect each other. Registered helpers produce trusted function actions/conditions, so no engine files or process-wide registry need changing.

```ts
import { createAuthoring, action } from '$lib/authoring';
import { integer } from '$lib/contracts';

const author = createAuthoring();
const grantCoins = author.registerAction('my-game/grantCoins', {
	parse: (value) => integer(value, 'amount', 1, 1000),
	run: async (state, amount, context) => {
		await state.resolveActions([action('coinsAdd', amount)], context);
	}
});
const hasCoins = author.registerCondition('my-game/hasCoins', {
	parse: (value) => integer(value, 'amount', 0),
	check: (state, amount) => state.character.coin >= amount
});

const reward = { ...grantCoins(5), valid: hasCoins(10) };
```

The parser determines the helper's argument type and must reject invalid values. Arguments are parsed when constructing the helper call and again when running it, including mutable objects. Actions can return async generators of additional actions. Conditions must return a boolean. Parsers should be pure; thrown errors include the extension name.

Player input uses `choose`, `useItem`, `equip`, `unequip`, or `runCommand`. Hooks must await nested `resolveActions` and avoid recursively calling `runCommand`. Use `pushChoices` for menus that retain roll/encounter context. Cooperatively cancel custom async work using `commandSignal` and `throwIfCommandCancelled`. Completed mutations are retained on failure/cancellation; consumables are reserved before their effects execute.

## Dice and random tables

Expressions support numbers, addition/subtraction, multiplication, unary signs, parentheses, `d6`/`2d6`, and bracketed context references such as `[@str]` and `[#maxhp]`. Multiplication and the final result truncate toward zero to support integer game mechanics. Arbitrary JavaScript, division, exponent notation, and unknown context keys are rejected.

Limits: 2,048 characters, 256 tokens, nesting depth 32, 1,000 total dice per expression, 1–1,000,000 sides, and finite intermediate/results within ±1,000,000,000,000. Dice count and sides must be positive integers; context-dependent values are also checked at execution. No `eval` is used. `wait` arguments are integers from 0 to 60,000 milliseconds.

For deterministic tests, use `createGameState(game, { random: (min, max) => min })`. The random source must return an integer in the inclusive range. `rollFormula`, `evaluateDiceRoll`, and `rollOnTable` also support injected randomness; tables passed a game state use that session's random source.

Table `active` conditions require game state, with optional action context:

```ts
rollOnTable(table, { state, ctx: state.actionContext });
```

Inactive entries do not renumber ranges or trigger a reroll. A rolled range with no active match returns an empty array. Overlapping ranges can return multiple matches; encounters use the first result, while `npcLoot` grants every matching item, including repeated IDs as separate copies. An empty loot result still grants the NPC’s coins and experience.

## Content checks and unfinished content

Sessions call `validateAdventure` before reading saves or initializing mutable state. Checks include duplicate IDs (NPC templates/instances share a namespace), starting/equipped/inventory references, biomes, parent cycles, shops, loot/encounter tables, declarative nested actions/conditions, dice formulas, numeric fields, and image path syntax. Diagnostics include author paths and are available through `inspectAdventure` or `ContentValidationError.diagnostics`.

Asset paths must be root-relative or HTTP(S) URLs. Path traversal and unsupported protocols fail. Browser validation checks syntax; `validateAdventure(game, { assets })` checks existence against a set of root-relative paths. `npm run validate:content` verifies the current adventures against files in `static`, and `npm run build` runs that check before building. Add each new adventure to the real-adventure check in `tests/content.test.ts`. External URLs are checked syntactically; they are not fetched to test availability.

An intentionally unfinished destination can be listed in `GameDef.unresolvedLocations`. A declarative travel reference to it produces a warning rather than preventing the rest of the adventure from initializing. It still cannot be a starting location or parent, and travel to it fails with a useful command notice until implemented. Discovery explicitly declares `unknown-woods`; this does not bypass other reference checks. Session warnings are available as `contentDiagnostics`.

Function hooks and custom extension closures cannot be statically inspected for hidden IDs or arbitrary behavior. Data lookups and dynamic declarative actions still validate at execution; cover hook behavior with focused engine tests. Increment `contentVersion` when changes invalidate checkpoint meaning or entity layouts; a content-specific checkpoint migration API remains separate work.

## Immutable definitions and world state

`defineAdventure(game)` returns a detached, deeply frozen snapshot with a readonly TypeScript type. `createGameState` also snapshots plain `GameDef` inputs, so existing object-literal adventures remain supported. Arrays and plain objects are copied; trusted functions retain their identity and their closures. Cyclic data and class instances are rejected. Store runtime resources outside adventure data.

A session exposes its readonly snapshot as `state.definition`. Runtime locations and NPCs read static fields from frozen definitions. The supported persistent overrides are `location.desc`, `location.shop[index].stock`, and named `npc.hp`. Character stats, inventory, equipment, flags, and counters remain runtime state. These overrides round trip through existing checkpoints; template NPCs get fresh health each time, while named NPCs retain damage. Use `state.data.locations.get(id)` to change an off-screen location. Static fields such as IDs, names, choices, item properties, and NPC maximum health cannot be edited during play. Add a supported runtime field and checkpoint representation when a new mechanic needs another persistent world override.

Freezing content does not isolate executable hooks or their captured variables. Modules should avoid mutable shared closures when sessions must be independent. Executable adventures remain trusted application code with browser access.

## Adventure rules

Attach `rules` directly to an adventure, or compose reusable modules with `ruleModules`. Registration is scoped like actions and conditions:

```ts
const author = createAuthoring();
const training = author.registerRules('my-game/training', {
	progression: {
		thresholds: [10, 30, 60],
		gains: (newLevel) => ({ str: 1, wil: 1, maxHp: newLevel })
	},
	combat: {
		npcAttack: 'd6-[@armor]',
		retaliationDelay: 500
	},
	encounters: { streakKey: () => 'all-wins', resetOnRun: false }
});

// In the adventure definition:
// ruleModules: [training],
// rules: { death: { item: 'my-game/defeat', message: 'Your journey ends here.' } }
```

`defineRuleModule(id, rules)` is also available from `$lib/rules`. Module IDs must be namespaced and unique within an adventure. Modules merge each rule group in array order; direct adventure overrides take precedence. Each field replaces the preceding field, including arrays, gain objects, and action trees. Unknown rule groups/fields, malformed formulas, and invalid progression configuration fail session validation. Rule hooks are not executed by content validation.

The rule groups are:

- `combat`: unarmed damage formula/type, natural NPC attack formula, retaliation delay, weapon selection, armor calculation, and character/NPC defence hooks. Selection, armor, and defence hooks are synchronous. Armor and returned damage must be finite; damage is truncated to an integer and clamped at zero. Default weapon selection finds an actual weapon in either hand; default armor comes from the torso. NPC `effects` still replace a natural attack.
- `equipment`: synchronous `slots(item, character)` and `canEquip(character, item, slot)` hooks for automatic player equipment. Only supported gear slots are accepted, and the item must be owned. Starting and restored equipment also checks slot compatibility and `canEquip`, after character stats, inventory, flags, and counters are initialized. An incompatible checkpoint starts a fresh session with a notice and protects the original save until Reset. Keep these hooks synchronous and free of mutations.
- `progression`: strictly increasing, nonnegative integer total-XP thresholds, optional maximum level, and a gain object or synchronous `gains(newLevel)` hook. Levels are one-based: threshold index 0 unlocks level 2. Equality reaches the level; a reward applies every crossed level. The default maximum is the number of thresholds plus one; an explicit lower cap is supported. An empty threshold list gives a single level. XP remains accumulated at the cap. Gains support `str`, `dex`, `wil`, and `maxHp`, each a nonnegative integer. Gains are validated before applying the reward, and increases in maximum HP do not heal current HP. Defaults retain Yearlings' thresholds and +2 strength, +2 dexterity, +8 maximum HP, ending at level 16.
- `encounters`: synchronous `streakKey(state)` returning a nonempty string or `undefined` to disable counters, `resetOnRun`, and optional `onFinish` actions. The default is a location-specific win counter reset on running. Finish actions receive the encounter result in context after the old encounter has been cleaned up, before its supplied follow-up.
- `death`: optional scene item, message, and `onDeath` actions. Combat calls `state.die(reason?)`; adventure hazards can call it too. It sets HP to zero and marks the context as a defeat. A hook may revive the character; otherwise recovery choices reload the existing checkpoint or explicitly discard only this adventure's checkpoint and restart. Failed death hooks still present recovery. Yearlings configures its existing artwork; Discovery uses the generic scene. A supplied reason takes precedence over the configured message.

All direct `hpDamage`/`npcDamage` effects now pass through the same defence policy as natural attacks. Numeric arguments remain supported; use a damage packet to specify type/source:

```ts
action('npcDamage', { amount: 20, type: 'fire', source: 'effect' });
action('hpDamage', { amount: { from: 'rollResult' }, type: 'poison' });
```

The default source is `effect`; natural attacks use `attack`. Untyped NPC damage reaches an NPC's existing `defend` hook with type `untyped`. Damage hooks should compute a result without changing health themselves. Inventory effects also participate in encounter turns and terminal outcome resolution, as described below.

## Engine-owned interactions

Use requests or declarative actions instead of changing scene/menu stacks. The session exposes `mode`, `scene`, `availableChoices`, and `canUseInventory` for presentation code. Modes are `exploration`, `combat`, `shop`, `conversation`, `death`, and `victory`. The renderer uses these views and the existing command methods; adventure modules do not import Svelte components.

```ts
action('dialogStart', {
	presentation: {
		title: 'The gatekeeper',
		description: 'A traveler waits beside the gate.',
		image: '/img/gatekeeper.webp'
	},
	message: 'Where will you go?',
	choices: [choice('Continue', [action('locationChange', 'my-game/road')])]
});

action('encounterStart', {
	npc: 'my-game/boss',
	flee: false,
	onVictory: [action('locationChange', 'my-game/ending')],
	onFinish: [action('messageSet', 'You return to exploring.')]
});

action('victoryShow', {
	presentation: { title: 'You win', description: 'Peace returns to the valley.' },
	choices: []
});
```

`dialogStart`, `victoryShow`, and `encounterStart` validate request shapes and nested declarative actions. Content validation checks NPC references, scene image paths, and continuation references. Trusted hooks can use `state.requestDialog(request)`, `state.requestChoices(choices)`, `await state.requestEncounter(request)`, `await state.requestTrade(message?)`, and `state.showVictory(request)`. Existing `shopStart`, `yesno`, `itemFind`, and `encounterRandomNpc` actions use the same owned lifecycle. `bossEncounter` remains a compatibility helper.

Dialog/choices requests return a handle with `active` and `close()`. A dialog response closes its own scene/menu before executing its actions, so a newly opened interaction survives the old response's cleanup. Nested dialogs restore the previous mode when closed. Travel invalidates all old handles and menus, clears transient scenes, and abandons the old encounter; death replaces them with recovery. Ending scenes persist until an explicit transition or reset. Use `presentation.title`, `description`, and `image`, plus choices/messages, to customize scenes; text is rendered as text rather than arbitrary HTML.

An encounter owns the Attack/Run menu, retaliation, victory menu, and cleanup. Default victory grants NPC loot/XP and offers Leave. A supplied `onVictory` replaces those default rewards; authors wanting them should explicitly call `npcLoot`. Victory is marked before rewards/hooks so failed or repeated input cannot grant the same encounter's rewards twice. `onFinish` runs after exit/cleanup when Leave/Run finishes an encounter. The existing rule-level `encounters.onFinish` runs first. `flee: false` removes Run. `deathMessage` can be text or a trusted synchronous function; recovery is engine-owned.

## Item effects and combat turns

Inventory effects are available during exploration and combat. Shop confirmations, dialogs, victory, and death block item/equipment mutations; the UI still lets players inspect their inventory. Equipped-item changes remain free during combat. Owned consumables are reserved before their effects, with no rollback after failure or cancellation.

Items can specify `combatUse: 'turn' | 'free' | 'forbidden'`. The default is `turn`: after effects finish, a living enemy retaliates once using the adventure's combat rules. Healing therefore takes a turn too. `free` skips retaliation but still checks victory/death. `forbidden` rejects combat use without consuming the item. Outside combat, these policies do not restrict use.

Damage from effects passes through the defence hooks. A killing item resolves victory immediately and skips retaliation; lethal character effects trigger recovery both inside and outside combat. Enemy effects are also checked for terminal outcomes. If an item opens a continuation prompt, the pending turn waits until the prompts are answered and combat becomes active again; roll context remains attached. Travel, replacement encounters, or death discard that old pending turn. Interrupted retaliation retains the consumed item and completed player effects without queuing another retaliation. Effects that throw still resolve terminal health outcomes; they do not trigger retaliation.

Transient interactions are not checkpoints. Saving is allowed only in living exploration without an active NPC/item scene. Checkpoints retain current shop stock, including items replenished through sales.

`state.interactions`, `choices`, `item`, and raw manager mutations remain available for legacy trusted hooks. They are implementation escape hatches, not the supported authoring surface: raw stack changes bypass mode ownership, lifecycle cleanup, and pending-turn handling. New content should use requests/declarative actions and await nested actions. These APIs preserve the existing trusted-code model; they do not sandbox executable adventures.

## Shop prices and stock

Items may define integer `price` (purchase base) and `sellPrice` (sale base). Each location’s shop listing has `item`, integer `stock`, optional `cost`, and optional `willBuy`. Listing `cost` overrides item `price`; at least one purchase base is required. Zero prices and zero stock are valid. Each purchase consumes one unit of stock; selling adds one. Stock persists in checkpoints and resets with a new game.

`willBuy: true` permits sales using the item’s `sellPrice`, or otherwise `rules.trade.saleRatio` times its `price` (falling back to listing `cost` for legacy items). The default ratio is `0.5`. A numeric `willBuy` sets an explicit sale base; `false` or omission disables sales. Only items listed by that shop can be sold. Sales consume one carried copy; equipped copies must first be unequipped.

Purchase prices multiply the base by `rules.trade.purchaseMultiplier` (default `1`) and the location’s `trade.purchaseMultiplier` (default `1`). Sale prices multiply the sale base by the location’s `trade.saleMultiplier` (default `1`). Multipliers range from `0` to `100`; final prices round down to whole coins. The sale ratio applies only when no explicit sale base exists. These settings allow authors to choose their economy, including intentionally profitable resale prices.

```ts
const potion = {
	id: 'potion',
	name: 'Potion',
	type: 'consumable',
	price: 20,
	sellPrice: 8
} satisfies Item;
const shop = {
	id: 'market',
	name: 'Market',
	biome: 'town',
	trade: { purchaseMultiplier: 1.1, saleMultiplier: 0.75 },
	shop: [{ item: 'potion', stock: 5, willBuy: true }]
} satisfies Location;
// Buy for 22; sell for 6. A listing cost or numeric willBuy overrides the base.
```

## Local assets and presentation

NES.css and Press Start 2P are served from `static/vendor`, with their licenses and provenance alongside them. Adventure images live in `static/img`, including the shared rat at `/img/npc/rat.webp`. The main scene reserves a square image frame, inventory images load lazily, and unavailable artwork falls back to its name. The layout stacks on mobile and supports scrolling dialogs, keyboard focus, and reduced motion preferences.

The application sets a [SvelteKit CSP](https://svelte.dev/docs/kit/configuration#csp) allowing resources from its own origin and inline style attributes needed by Svelte transitions. Scripts use SvelteKit’s automatic hashes/nonces; object embedding and framing are blocked. Content validation still accepts HTTP(S) image paths, but using an external image requires explicitly allowing its origin in `svelte.config.js`. Trusted TypeScript adventures remain executable application code, not a sandbox. Self-hosting removes these external asset requests; it does not provide an offline service worker or preload every adventure image.
