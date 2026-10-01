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
import type { ArgumentField } from '$lib/arguments';
import { encounterRandomNpc } from '$lib/games/encounter';

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
	shopFinish,
	encounterRandomNpc
} as const;

export type ActionName = keyof typeof actions;

export type ActionFn = (state: GameState, ctx: ActionContext) => void | Promise<void>;
export type ActionArgs = {
	[K in ActionName]: Parameters<(typeof actions)[K]> extends [GameState, ...infer Rest]
		? Rest extends []
			? never
			: Rest[0]
		: never;
};
export type BuiltinAction = {
	[K in ActionName]: { action: K; valid?: Condition } & ArgumentField<ActionArgs[K]>;
}[ActionName];
export type CustomAction = {
	action: (state: GameState, arg: undefined, ctx: ActionContext) => unknown;
	arg?: never;
	valid?: Condition;
};
export type Action = BuiltinAction | CustomAction;
export type Actions = Action[] | ActionFn;
