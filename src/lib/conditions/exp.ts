import type { GameState } from '$state/game.svelte';

export function xpMoreThan(state: GameState, amt: number) {
	console.log(`Checking ${state.character.xp} xpMoreThan ${amt}`);
	return state.character.xp > amt;
}
