import { checkCondition, type Conditional } from '$lib/conditions';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function wait(_: GameState, ms: number) {
	await new Promise((r) => setTimeout(r, ms));
}

export async function branch(
	state: GameState,
	{ on, isFalse, isTrue }: { on: Conditional; isTrue: Action[]; isFalse?: Action[] }
) {
	return (async function* () {
		if (checkCondition(on, state)) {
			yield isTrue;
		} else if (Array.isArray(isFalse)) {
			yield isFalse;
		}
	})();
}
