import type { GameState } from '$state/game.svelte';

export function hpFull(state: GameState) {
	return state.character.hp === state.character.maxHp;
}

export function hpIs(state: GameState, amt: number) {
	return state.character.hp === amt;
}
