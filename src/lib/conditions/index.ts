import type { GameState } from '$state/game.svelte';
import { xpMoreThan } from './exp';
import { flagIsSet, flagIsNotSet } from './flags';
import { levelAtLeast } from './level';

const conditions = {
	flagIsSet,
	flagIsNotSet,
	xpMoreThan,
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
	fn(state, when.arg as never); // ugh.
}
