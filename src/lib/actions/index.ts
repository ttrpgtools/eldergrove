import { checkCondition, type Conditional } from '$lib/conditions';
import { messageClear, messageSet } from './conversation';
import { flagSet, flagUnset } from './flags';
import { locationChange, locationReturn } from './location';
import type { GameState } from '$state/game.svelte';
import { encounterFinish, encounterRandomNpc } from './encounter';
import { shopStart, shopFinish, shopInspect } from './shop';
import { coinsAdd, coinsRemove } from './coins';

export function isActionValid(action: Action, gamestate: GameState) {
	if (action.valid == null) return true;
	return checkCondition(action.valid, gamestate);
}

export const actions = {
	flagSet,
	flagUnset,
	locationChange,
	locationReturn,
	messageClear,
	messageSet,
	coinsAdd,
	coinsRemove,
	encounterRandomNpc,
	encounterFinish,
	shopStart,
	shopFinish,
	shopInspect
} as const;

export type ActionName = keyof typeof actions;

export interface Action {
	action: ActionName;
	arg?: unknown;
	valid?: Conditional;
}
