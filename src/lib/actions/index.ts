import { checkCondition, type Condition } from '$lib/conditions';
import { messageAppend, messageClear, messageSet } from './conversation';
import { flagSet, flagUnset } from './flags';
import { locationChange, locationDesc, locationReturn } from './location';
import type { GameState } from '$state/game.svelte';
import { shopStart, shopFinish } from './shop';
import { coinsAdd, coinsRemove } from './coins';
import { choicesPop, choicesPush, yesno } from './choices';
import { inventoryAdd, inventoryRemove, itemFind, itemPop, itemPush, itemUse } from './items';
import type { ActionContext } from '$lib/types';
import { counterDec, counterInc, counterReset } from './counters';
import { hpDamage, hpHeal } from './hp';
import { diceMinZero, diceRoll } from './dice';
import { npcDamage, npcHeal, npcLoot } from './npc';
import { branch, wait } from './control';

export function isActionValid(action: Action, gamestate: GameState, ctx: ActionContext) {
	if (action.valid == null) return true;
	return checkCondition(action.valid, gamestate, ctx);
}

export const actions = {
	wait,
	branch,
	flagSet,
	flagUnset,
	counterInc,
	counterDec,
	counterReset,
	hpDamage,
	hpHeal,
	diceRoll,
	diceMinZero,
	choicesPop,
	choicesPush,
	itemPop,
	itemPush,
	inventoryAdd,
	inventoryRemove,
	itemUse,
	itemFind,
	locationChange,
	locationReturn,
	locationDesc,
	messageClear,
	messageSet,
	messageAppend,
	yesno,
	coinsAdd,
	coinsRemove,
	npcDamage,
	npcHeal,
	npcLoot,
	shopStart,
	shopFinish
} as const;

export type ActionName = keyof typeof actions;

export type ActionFn = (state: GameState) => void | Promise<void>;
export interface Action {
	action: ActionName | ((state: GameState, arg: unknown, ctx: ActionContext) => unknown);
	arg?: unknown;
	valid?: Condition;
}

export type Actions = Action[] | ActionFn;
