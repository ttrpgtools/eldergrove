import type { GameState } from '$state/game.svelte';

export async function flagSet(state: GameState, flag: string) {
	state.character.flags.add(flag);
}

export async function flagUnset(state: GameState, flag: string) {
	state.character.flags.delete(flag);
}
