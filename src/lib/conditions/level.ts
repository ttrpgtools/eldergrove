import type { GameState } from '$state/game.svelte';

export function levelAtLeast(state: GameState, level: number) {
	return state.character.level >= level;
}
