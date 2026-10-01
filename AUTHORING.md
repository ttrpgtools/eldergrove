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

Inactive entries do not renumber ranges or trigger a reroll. A rolled range with no active match returns an empty array. Overlapping ranges can return multiple matches; encounter and loot consumers currently use the first result. General multi-result loot rules remain future work.

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
- `equipment`: synchronous `slots(item, character)` and `canEquip(character, item, slot)` hooks for automatic player equipment. Only supported gear slots are accepted, and the item must be owned. Starting/restored equipment uses the validated checkpoint definition; these hooks do not silently remove existing gear.
- `progression`: strictly increasing, nonnegative integer total-XP thresholds, optional maximum level, and a gain object or synchronous `gains(newLevel)` hook. Levels are one-based: threshold index 0 unlocks level 2. Equality reaches the level; a reward applies every crossed level. The default maximum is the number of thresholds plus one; an explicit lower cap is supported. An empty threshold list gives a single level. XP remains accumulated at the cap. Gains support `str`, `dex`, `wil`, and `maxHp`, each a nonnegative integer. Gains are validated before applying the reward, and increases in maximum HP do not heal current HP. Defaults retain Yearlings' thresholds and +2 strength, +2 dexterity, +8 maximum HP, ending at level 16.
- `encounters`: synchronous `streakKey(state)` returning a nonempty string or `undefined` to disable counters, `resetOnRun`, and optional `onFinish` actions. The default is a location-specific win counter reset on running. Finish actions receive the encounter result in context after the old encounter has been cleaned up, before its supplied follow-up.
- `death`: optional scene item, message, and `onDeath` actions. Combat calls `state.die(reason?)`; adventure hazards can call it too. It sets HP to zero and marks the context as a defeat. A hook may revive the character; otherwise recovery choices reload the existing checkpoint or explicitly discard only this adventure's checkpoint and restart. Failed death hooks still present recovery. Yearlings configures its existing artwork; Discovery uses the generic scene. A supplied reason takes precedence over the configured message.

All direct `hpDamage`/`npcDamage` effects now pass through the same defence policy as natural attacks. Numeric arguments remain supported; use a damage packet to specify type/source:

```ts
action('npcDamage', { amount: 20, type: 'fire', source: 'effect' });
action('hpDamage', { amount: { from: 'rollResult' }, type: 'poison' });
```

The default source is `effect`; natural attacks use `attack`. Untyped NPC damage reaches an NPC's existing `defend` hook with type `untyped`. Damage hooks should compute a result without changing health themselves. Item turn consumption and immediate encounter victory/death resolution remain the next interaction-lifecycle workstream.
