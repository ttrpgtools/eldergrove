import { resolveNumber, type NumericValue } from '$lib/arguments';
import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { minZero } from '$util/math';

export async function hpDamage(
	state: GameState,
	value: NumericValue,
	ctx: ActionContext = state.actionContext
) {
	let amt = resolveNumber(value, ctx);
	amt = minZero(amt);
	state.character.takeDamage(amt);
	state.events.emit('hpChange', 0 - amt);
}

export async function hpHeal(
	state: GameState,
	value: NumericValue,
	ctx: ActionContext = state.actionContext
) {
	let amt = resolveNumber(value, ctx);
	amt = minZero(amt);
	state.character.heal(amt);
	state.events.emit('hpChange', amt);
}
