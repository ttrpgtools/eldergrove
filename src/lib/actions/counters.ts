import type { GameState } from '$state/game.svelte';

export async function counterInc(state: GameState, counter: string) {
	state.character.counters.set(counter, (state.character.counters.get(counter) ?? 0) + 1);
}

export async function counterDec(state: GameState, counter: string) {
	state.character.counters.set(counter, (state.character.counters.get(counter) ?? 0) - 1);
}

export async function counterReset(state: GameState, counter: string) {
	state.character.counters.set(counter, 0);
}
