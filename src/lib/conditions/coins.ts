import type { GameState } from '$state/game.svelte';

export function coinsAtLeast(state: GameState, amt: number) {
	return state.character.coin >= amt;
}

export function coinsLessThan(state: GameState, amt: number) {
	return state.character.coin < amt;
}
