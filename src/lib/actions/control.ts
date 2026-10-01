import { checkCondition, type Condition } from '$lib/conditions';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';
import type { ActionContext } from '$lib/types';

export async function wait(state: GameState, ms: number) {
	await state.wait(ms);
}

export async function branch(
	state: GameState,
	{ on, isFalse, isTrue }: { on: Condition; isTrue: Action[]; isFalse?: Action[] },
	ctx: ActionContext = state.actionContext
) {
	return (async function* () {
		if (checkCondition(on, state, ctx)) {
			yield isTrue;
		} else if (Array.isArray(isFalse)) {
			yield isFalse;
		}
	})();
}
