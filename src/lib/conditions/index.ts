import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { coinsAtLeast, coinsLessThan } from './coins';
import { ctxEquals } from './context';
import { counterIsEqual } from './counters';
import { xpMoreThan } from './exp';
import { flagIsSet, flagIsNotSet } from './flags';
import { hpFull, hpIs } from './hp';
import { levelAtLeast } from './level';
import { npcDead, npcNotDead } from './npc';

const conditions = {
	flagIsSet,
	flagIsNotSet,
	counterIsEqual,
	xpMoreThan,
	coinsAtLeast,
	coinsLessThan,
	hpFull,
	hpIs,
	levelAtLeast,
	npcDead,
	npcNotDead,
	ctxEquals
} as const;

export type ConditionName = keyof typeof conditions;
export interface Conditional {
	condition: ConditionName;
	arg?: unknown;
	not?: boolean;
}
export function checkCondition(when: Conditional, state: GameState, ctx?: ActionContext) {
	if (!(when.condition in conditions)) throw `Unknown condition ${when.condition}`;
	const fn = conditions[when.condition];
	const result = fn(state, when.arg as never, ctx); // ugh.
	return when.not === true ? !result : result;
}
