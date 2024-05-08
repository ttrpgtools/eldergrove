import { checkCondition, type Conditional } from '$lib/conditions';
import { messageClear, messageSet } from './conversation';
import { flagSet, flagUnset } from './flags';
import { locationChange, locationReturn } from './location';
import type { GameState } from '$state/game.svelte';
import { encounterFinish, encounterRandomNpc } from './encounter';
import { shopStart, shopFinish } from './shop';
import { coinsAdd, coinsRemove } from './coins';
import { choicesPop, choicesPush, yesno } from './choices';
import { inventoryAdd, itemPop, itemPush } from './items';
import type { ActionContext } from '$lib/types';
import { counterDec, counterInc, counterReset } from './counters';

export function isActionValid(action: Action, gamestate: GameState, ctx: ActionContext) {
	if (action.valid == null) return true;
	return checkCondition(action.valid, gamestate, ctx);
}

export const actions = {
	flagSet,
	flagUnset,
	counterInc,
	counterDec,
	counterReset,
	choicesPop,
	choicesPush,
	itemPop,
	itemPush,
	inventoryAdd,
	locationChange,
	locationReturn,
	messageClear,
	messageSet,
	yesno,
	coinsAdd,
	coinsRemove,
	encounterRandomNpc,
	encounterFinish,
	shopStart,
	shopFinish
} as const;

export type ActionName = keyof typeof actions;

export interface Action {
	action: ActionName;
	arg?: unknown;
	valid?: Conditional;
}
