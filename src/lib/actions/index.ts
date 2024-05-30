import { checkCondition, type Conditional } from '$lib/conditions';
import { messageAppend, messageClear, messageSet } from './conversation';
import { flagSet, flagUnset } from './flags';
import { locationChange, locationDesc, locationReturn } from './location';
import type { GameState } from '$state/game.svelte';
import { encounterFinish, encounterRandomNpc } from './encounter';
import { shopStart, shopFinish } from './shop';
import { coinsAdd, coinsRemove } from './coins';
import { choicesPop, choicesPush, yesno } from './choices';
import { inventoryAdd, inventoryRemove, itemFind, itemPop, itemPush, itemUse } from './items';
import type { ActionContext } from '$lib/types';
import { counterDec, counterInc, counterReset } from './counters';
import { hpDamage, hpHeal } from './hp';
import { diceMinZero, diceRoll } from './dice';
import { npcDamage, npcHeal, npcLoot } from './npc';
import { attackFromCharacter, attackFromNpc } from './attacks';
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
	attackFromCharacter,
	attackFromNpc,
	locationChange,
	locationReturn,
	locationDesc,
	messageClear,
	messageSet,
	messageAppend,
	yesno,
	coinsAdd,
	coinsRemove,
	encounterRandomNpc,
	encounterFinish,
	npcDamage,
	npcHeal,
	npcLoot,
	shopStart,
	shopFinish
} as const;

export type ActionName = keyof typeof actions;

export interface Action {
	action: ActionName;
	arg?: unknown;
	valid?: Conditional;
}

export type ActionFn = (state: GameState) => void | Promise<void>;
export type Actions = Action[] | ActionFn;
