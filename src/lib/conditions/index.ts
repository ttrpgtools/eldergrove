import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { coinsAtLeast, coinsLessThan } from './coins';
import { ctxEquals } from './context';
import { counterIsEqual } from './counters';
import { xpMoreThan } from './exp';
import { flagIsSet, flagIsNotSet } from './flags';
import { levelAtLeast } from './level';

const conditions = {
	flagIsSet,
	flagIsNotSet,
	counterIsEqual,
	xpMoreThan,
	coinsAtLeast,
	coinsLessThan,
	levelAtLeast,
	ctxEquals
} as const;

export type ConditionName = keyof typeof conditions;
export interface Conditional {
	condition: ConditionName;
	arg?: unknown;
}
export function checkCondition(when: Conditional, state: GameState, ctx?: ActionContext) {
	if (!(when.condition in conditions)) throw `Unknown condition ${when.condition}`;
	const fn = conditions[when.condition];
	return fn(state, when.arg as never, ctx); // ugh.
}
