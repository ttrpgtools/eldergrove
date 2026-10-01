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

`defineAdventure` checks the `GameDef` shape at compile time; `validateAdventure` performs runtime content checks. It does not execute hooks. A numeric action amount can be a literal number or `{ from: 'rollResult' }`. The latter requires a preceding `diceRoll` in the same action/continuation context; a missing result raises an error. `diceMinZero` also requires an existing roll.

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
