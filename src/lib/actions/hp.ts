import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { rollFormula } from '$util/dice';

export async function hpDamage(state: GameState, amt: number | undefined, ctx: ActionContext) {
	amt = amt ?? Math.max(0, ctx.rollResult ?? 0);
	state.character.takeDamage(amt);
}

export async function hpHeal(state: GameState, amt: number | string) {
	if (typeof amt === 'string') {
		amt = rollFormula(amt);
	}
	state.character.heal(amt);
}
