import { resolveNumber, type NumericValue } from '$lib/arguments';
import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export async function coinsAdd(
	state: GameState,
	value: NumericValue,
	ctx: ActionContext = state.actionContext
) {
	const amt = resolveNumber(value, ctx);
	state.character.coin += amt;
}

export async function coinsRemove(
	state: GameState,
	value: NumericValue,
	ctx: ActionContext = state.actionContext
) {
	const amt = resolveNumber(value, ctx);
	state.character.coin -= Math.min(state.character.coin, amt);
}
