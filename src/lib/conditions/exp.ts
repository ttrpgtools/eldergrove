import type { GameState } from '$state/game.svelte';

export function xpMoreThan(state: GameState, amt: number) {
	return state.character.xp > amt;
}
