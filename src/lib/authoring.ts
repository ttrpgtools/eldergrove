import { defineRuleModule, type RuleOverrides } from './rules';
import { immutableSnapshot, type Immutable } from './definitions';
import type { ActionArgs, ActionName, Actions, BuiltinAction, CustomAction } from './actions';
import type {
	ConditionArgs,
	ConditionFn,
	ConditionName,
	Conditional,
	Condition
} from './conditions';
import type { ArgumentTuple } from './arguments';
import type { ActionContext, Choice, GameDef } from './types';
import type { GameState } from './state/game.svelte';
import { assertAction, assertCondition } from './contracts';

export function action<K extends ActionName>(
	name: K,
	...args: ArgumentTuple<ActionArgs[NoInfer<K>]>
): Extract<BuiltinAction, { action: K }> {
	const step = { action: name, ...(args.length ? { arg: args[0] } : {}) };
	assertAction(step);
	return step as Extract<BuiltinAction, { action: K }>;
}
export function condition<K extends ConditionName>(
	name: K,
	...args: ArgumentTuple<ConditionArgs[NoInfer<K>]>
): Extract<Conditional, { condition: K }> {
	const result = { condition: name, ...(args.length ? { arg: args[0] } : {}) };
	assertCondition(result);
	return result as Extract<Conditional, { condition: K }>;
}
export function choice(label: string, actions: Actions, show?: Condition): Choice {
	return { label, actions, ...(show ? { show } : {}) };
}
export function defineAdventure<T extends GameDef>(game: T): Immutable<T> {
	return immutableSnapshot(game);
}

export type ArgumentParser<T> = (value: unknown) => T;
/** Registrations belong to an author/adventure, never a process-wide mutable registry. */
export function createAuthoring() {
	const names = new Set<string>();
	function register<T>(kind: string, name: string, parse: ArgumentParser<T>) {
		if (!/^[\w-]+\/[\w/-]+$/.test(name))
			throw new Error('Extension names must be namespaced, e.g. my-game/giveGold.');
		const key = `${kind}:${name}`;
		if (names.has(key)) throw new Error(`Duplicate ${kind} extension: ${name}`);
		names.add(key);
		return (value: unknown): T => {
			try {
				return parse(value);
			} catch (error) {
				throw new Error(
					`${kind} extension '${name}': ${error instanceof Error ? error.message : String(error)}`,
					{ cause: error }
				);
			}
		};
	}
	return {
		action,
		condition,
		choice,
		defineAdventure,
		registerRules(name: string, rules: RuleOverrides) {
			register('rule', name, (value) => value);
			return defineRuleModule(name, rules);
		},
		registerAction<T>(
			name: string,
			definition: {
				parse: ArgumentParser<T>;
				run: (state: GameState, arg: T, ctx: ActionContext) => unknown;
			}
		) {
			const parse = register('action', name, definition.parse);
			return (...args: ArgumentTuple<T>): CustomAction => {
				parse(args[0]);
				return { action: (state, _, ctx) => definition.run(state, parse(args[0]), ctx) };
			};
		},
		registerCondition<T>(
			name: string,
			definition: {
				parse: ArgumentParser<T>;
				check: (state: GameState, arg: T, ctx: ActionContext) => boolean;
			}
		) {
			const parse = register('condition', name, definition.parse);
			return (...args: ArgumentTuple<T>): ConditionFn => {
				parse(args[0]);
				return (state, ctx) => {
					const result = definition.check(state, parse(args[0]), ctx ?? state.actionContext);
					if (typeof result !== 'boolean')
						throw new Error(`Condition extension '${name}' must return a boolean.`);
					return result;
				};
			};
		}
	};
}
