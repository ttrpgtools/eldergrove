import type { GameState } from '$state/game.svelte';
import { coinsAtLeast, coinsLessThan } from './coins';
import { xpMoreThan } from './exp';
import { flagIsSet, flagIsNotSet } from './flags';
import { levelAtLeast } from './level';

const conditions = {
	flagIsSet,
	flagIsNotSet,
	xpMoreThan,
	coinsAtLeast,
	coinsLessThan,
	levelAtLeast
} as const;

export type ConditionName = keyof typeof conditions;
export interface Conditional {
	condition: ConditionName;
	arg?: unknown;
}
export function checkCondition(when: Conditional, state: GameState) {
	if (!(when.condition in conditions)) throw `Unknown condition ${when.condition}`;
	const fn = conditions[when.condition];
	return fn(state, when.arg as never); // ugh.
}
