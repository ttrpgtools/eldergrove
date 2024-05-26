import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { coinsAtLeast, coinsLessThan } from './coins';
import { ctxRollEquals, ctxWasVictory } from './context';
import { counterIsEqual } from './counters';
import { xpMoreThan } from './exp';
import { flagIsSet, flagIsNotSet } from './flags';
import { hpFull, hpIs } from './hp';
import { inventoryContains } from './items';
import { levelAtLeast } from './level';
import { npcDead, npcNotDead } from './npc';

const conditions = {
	flagIsSet,
	flagIsNotSet,
	counterIsEqual,
	inventoryContains,
	xpMoreThan,
	coinsAtLeast,
	coinsLessThan,
	hpFull,
	hpIs,
	levelAtLeast,
	npcDead,
	npcNotDead,
	ctxRollEquals,
	ctxWasVictory
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
