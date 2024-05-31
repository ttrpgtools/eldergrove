import type { GameState } from '$state/game.svelte';
import { minZero } from '$util/math';

export async function hpDamage(state: GameState, amt: number) {
	amt = minZero(amt);
	state.character.takeDamage(amt);
	state.events.emit('hpChange', 0 - amt);
}

export async function hpHeal(state: GameState, amt: number) {
	amt = minZero(amt);
	state.character.heal(amt);
	state.events.emit('hpChange', amt);
}
