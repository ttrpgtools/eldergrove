import type { GameState } from '$state/game.svelte';

export function flagIsSet(state: GameState, flag: string) {
	return state.character.flags.has(flag);
}

export function flagIsNotSet(state: GameState, flag: string) {
	return !state.character.flags.has(flag);
}
