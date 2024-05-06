import type { GameState } from '$state/game.svelte';

export function coinsAtLeast(state: GameState, amt: number) {
	console.log(`Checking ${state.character.coin} coinsAtLeast ${amt}`);
	return state.character.coin >= amt;
}

export function coinsLessThan(state: GameState, amt: number) {
	console.log(`Checking ${state.character.coin} coinsLessThan ${amt}`);
	return state.character.coin < amt;
}
