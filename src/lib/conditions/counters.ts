import type { GameState } from '$state/game.svelte';

export function counterIsEqual(state: GameState, [counter, val]: [string, number]) {
	return state.character.counters.get(counter) === val;
}
