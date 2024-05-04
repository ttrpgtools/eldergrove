import type { GameState } from '$state/game.svelte';

export async function coinsAdd(state: GameState, amt: number) {
	state.character.coin += amt;
}

export async function coinsRemove(state: GameState, amt: number) {
	state.character.coin -= Math.min(state.character.coin, amt);
}
