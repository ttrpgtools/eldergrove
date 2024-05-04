import { checkCondition, type Conditional } from '$lib/conditions';
import { messageClear, messageSet } from './conversation';
import { flagSet, flagUnset } from './flags';
import { locationChange, locationReturn } from './location';
import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { isAsyncGenerator } from '$util/validate';
import { DynamicIterable } from '$util/async';
import { encounterFinish, encounterRandomNpc } from './encounter';
import { shopStart, shopFinish, shopInspect } from './shop';
import { coinsAdd, coinsRemove } from './coins';

export function isActionValid(action: Action, gamestate: GameState) {
	if (action.valid == null) return true;
	return checkCondition(action.valid, gamestate);
}

function makeContext(): ActionContext {
	return {
		locations: new Set()
	};
}

const actions = {
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

export async function resolveActions(list: Action[], state: GameState) {
	console.log(`resolving Actions`, list);
	const ctx = makeContext();
	const linked = new DynamicIterable(list);
	for await (const act of linked) {
		console.log(`action:`, act);
		if (!(act.action in actions)) throw `Unknown action ${act.action}`;
		if (isActionValid(act, state)) {
			console.log(`starting processing of action`);
			const res = await actions[act.action](state, act.arg as never, ctx);
			console.log(`results are in`, res, res?.toString());
			if (res && isAsyncGenerator(res)) {
				console.log(`looping over the inner generator`);
				for await (const inner of res) {
					linked.insertItems(inner);
				}
			}
		}
	}
}
